import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, internalServerError, jsonResponse } from "../_shared/cors.ts";

const MAX_SCORE = 1_000_000;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const puzzleId = body.puzzle_id;
  const score = body.score;
  const timeMs = body.time_ms;
  const clientMeta = body.client_meta;

  if (typeof puzzleId !== "string" || !/^[0-9a-f-]{36}$/i.test(puzzleId)) {
    return jsonResponse({ error: "puzzle_id must be a UUID string" }, 400);
  }
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return jsonResponse(
      { error: `score must be a number between 0 and ${MAX_SCORE}` },
      400,
    );
  }
  if (timeMs !== undefined && timeMs !== null) {
    if (typeof timeMs !== "number" || !Number.isFinite(timeMs) || timeMs < 0) {
      return jsonResponse({ error: "time_ms must be a non-negative number" }, 400);
    }
  }
  if (
    clientMeta !== undefined &&
    clientMeta !== null &&
    (typeof clientMeta !== "object" || Array.isArray(clientMeta))
  ) {
    return jsonResponse({ error: "client_meta must be a JSON object" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: puzzle, error: puzzleErr } = await admin
    .from("puzzles")
    .select("id, play_date, status")
    .eq("id", puzzleId)
    .maybeSingle();

  if (puzzleErr) {
    return internalServerError(puzzleErr);
  }
  if (!puzzle || puzzle.status !== "published") {
    return jsonResponse({ error: "Puzzle not found or not published" }, 404);
  }

  const puzzleDate = puzzle.play_date as string;
  if (puzzleDate > utcToday()) {
    return jsonResponse({ error: "Cannot submit for a future puzzle" }, 400);
  }

  const intScore = Math.round(score);
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
    return internalServerError(insertErr);
  }

  return jsonResponse({
    ok: true,
    result: inserted,
    leaderboard_hint:
      "get_leaderboard(play_date) ranks each user by their best score that day (unlimited plays allowed).",
  });
});
