import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  corsHeadersForRequest,
  internalServerError,
  jsonResponse,
} from "../_shared/cors.ts";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersForRequest(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500, req);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  let playDate: string | null = null;
  if (req.method === "GET") {
    const url = new URL(req.url);
    playDate = url.searchParams.get("play_date");
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      playDate = typeof body?.play_date === "string" ? body.play_date : null;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, req);
    }
  } else {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  const date = playDate ?? utcToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonResponse({ error: "Invalid play_date; use YYYY-MM-DD" }, 400, req);
  }

  if (date > utcToday()) {
    return jsonResponse({ error: "play_date cannot be in the future" }, 400, req);
  }

  const { data, error } = await admin
    .from("puzzles")
    .select("id, play_date, puzzle_payload, version, title, checksum")
    .eq("play_date", date)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return internalServerError(error, req);
  }
  if (!data) {
    return jsonResponse({ error: "Puzzle not found for this date" }, 404, req);
  }

  return jsonResponse({ puzzle: data }, 200, req);
});
