import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  corsHeadersForRequest,
  internalServerError,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  gradeOrderedAnswers,
  parseDailyTensPayload,
} from "../_shared/daily-tens.ts";
import { checkSubmitRateLimit, clientIp } from "../_shared/rate-limit.ts";

const MAX_ANSWERS = 200;
const MAX_ANSWER_LEN = 2_000;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersForRequest(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500, req);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401, req);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Invalid session" }, 401, req);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const puzzleId = body.puzzle_id;
  const answersRaw = body.answers;
  const timeMs = body.time_ms;
  const clientMeta = body.client_meta;

  if (typeof puzzleId !== "string" || !/^[0-9a-f-]{36}$/i.test(puzzleId)) {
    return jsonResponse({ error: "puzzle_id must be a UUID string" }, 400, req);
  }
  if (!Array.isArray(answersRaw)) {
    return jsonResponse(
      { error: "answers must be an array of strings (server grades your attempt)" },
      400,
      req,
    );
  }
  if (answersRaw.length > MAX_ANSWERS) {
    return jsonResponse(
      { error: `answers array too long (max ${MAX_ANSWERS})` },
      400,
      req,
    );
  }
  for (let i = 0; i < answersRaw.length; i++) {
    const a = answersRaw[i];
    if (typeof a !== "string") {
      return jsonResponse({ error: `answers[${i}] must be a string` }, 400, req);
    }
    if (a.length > MAX_ANSWER_LEN) {
      return jsonResponse({ error: `answers[${i}] exceeds max length` }, 400, req);
    }
  }
  const answers = answersRaw as string[];
  if (timeMs !== undefined && timeMs !== null) {
    if (typeof timeMs !== "number" || !Number.isFinite(timeMs) || timeMs < 0) {
      return jsonResponse({ error: "time_ms must be a non-negative number" }, 400, req);
    }
  }
  if (
    clientMeta !== undefined &&
    clientMeta !== null &&
    (typeof clientMeta !== "object" || Array.isArray(clientMeta))
  ) {
    return jsonResponse({ error: "client_meta must be a JSON object" }, 400, req);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const ip = clientIp(req);
  const rl = await checkSubmitRateLimit(admin, user.id, ip);
  if (!rl.ok) {
    return jsonResponse(
      {
        error: "Too many submissions. Try again in a minute.",
        retry_after_seconds: rl.retryAfterSec,
      },
      429,
      req,
    );
  }

  const { data: puzzle, error: puzzleErr } = await admin
    .from("puzzles")
    .select("id, play_date, status, puzzle_payload")
    .eq("id", puzzleId)
    .maybeSingle();

  if (puzzleErr) {
    return internalServerError(puzzleErr, req);
  }
  if (!puzzle || puzzle.status !== "published") {
    return jsonResponse({ error: "Puzzle not found or not published" }, 404, req);
  }

  const puzzleDate = puzzle.play_date as string;
  if (puzzleDate > utcToday()) {
    return jsonResponse({ error: "Cannot submit for a future puzzle" }, 400, req);
  }

  const payload = parseDailyTensPayload(puzzle.puzzle_payload);
  if (!payload) {
    return jsonResponse({ error: "Puzzle payload is not a supported daily tens format" }, 400, req);
  }
  const { score: serverScore } = gradeOrderedAnswers(payload.answers, answers);

  const intScore = serverScore;
  const intTimeMs = timeMs == null ? null : Math.round(timeMs as number);

  const { data: inserted, error: insertErr } = await admin
    .from("game_results")
    .insert({
      user_id: user.id,
      puzzle_id: puzzleId,
      score: intScore,
      time_ms: intTimeMs,
      client_meta: clientMeta ?? null,
    })
    .select("id, score, time_ms, created_at")
    .single();

  if (insertErr) {
    return internalServerError(insertErr, req);
  }

  return jsonResponse({
    ok: true,
    result: inserted,
    leaderboard_hint:
      "get_leaderboard(play_date) ranks each user by their best score that day (unlimited plays allowed).",
  }, 200, req);
});
