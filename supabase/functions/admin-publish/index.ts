import {
  corsHeadersForRequest,
  internalServerError,
  jsonResponse,
} from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/admin.ts";

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

  const gate = await requireAdmin(req, supabaseUrl, anonKey, serviceKey);
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const playDate = body.play_date;
  const status = body.status;

  if (typeof playDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(playDate)) {
    return jsonResponse({ error: "play_date is required (YYYY-MM-DD)" }, 400, req);
  }
  if (status !== "published" && status !== "draft") {
    return jsonResponse({ error: "status must be published or draft" }, 400, req);
  }

  const { data, error } = await gate.admin
    .from("puzzles")
    .update({ status })
    .eq("play_date", playDate)
    .select()
    .maybeSingle();

  if (error) {
    return internalServerError(error, req);
  }
  if (!data) {
    return jsonResponse(
      { error: "No puzzle row for this play_date; upsert first" },
      404,
      req,
    );
  }

  return jsonResponse({ puzzle: data }, 200, req);
});
