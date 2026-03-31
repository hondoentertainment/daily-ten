import { corsHeaders, internalServerError, jsonResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/admin.ts";

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

  const gate = await requireAdmin(req, supabaseUrl, anonKey, serviceKey);
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const playDate = body.play_date;
  const puzzlePayload = body.puzzle_payload;
  const title = body.title;
  const status = body.status;
  const version = body.version;
  const checksum = body.checksum;

  if (typeof playDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(playDate)) {
    return jsonResponse({ error: "play_date is required (YYYY-MM-DD)" }, 400);
  }
  if (
    puzzlePayload !== undefined &&
    puzzlePayload !== null &&
    (typeof puzzlePayload !== "object" || Array.isArray(puzzlePayload))
  ) {
    return jsonResponse({ error: "puzzle_payload must be a JSON object" }, 400);
  }
  if (status !== undefined && status !== "draft" && status !== "published") {
    return jsonResponse({ error: "status must be draft or published" }, 400);
  }
  if (version !== undefined && (typeof version !== "number" || !Number.isInteger(version) || version < 1)) {
    return jsonResponse({ error: "version must be a positive integer" }, 400);
  }

  const row: Record<string, unknown> = {
    play_date: playDate,
    puzzle_payload: puzzlePayload ?? {},
    title: typeof title === "string" ? title : null,
    status: status ?? "draft",
    version: version ?? 1,
    checksum: typeof checksum === "string" ? checksum : null,
  };

  const { data, error } = await gate.admin
    .from("puzzles")
    .upsert(row, { onConflict: "play_date" })
    .select()
    .single();

  if (error) {
    return internalServerError(error);
  }

  return jsonResponse({ puzzle: data });
});
