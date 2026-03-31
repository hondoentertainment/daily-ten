export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Log server-side; never expose DB/PostgREST details to clients. */
export function internalServerError(cause?: unknown): Response {
  if (cause !== undefined) console.error(cause);
  return jsonResponse({ error: "Internal server error" }, 500);
}
