/** Parse ALLOWED_ORIGINS env: comma-separated list. Empty or unset = allow all (*). */
export function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS")?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * CORS headers for browser calls. If ALLOWED_ORIGINS is set, only listed origins
 * (exact match) are echoed; requests with no Origin get the first allowed origin
 * or * if list contains *.
 */
export function corsHeadersForRequest(req: Request): Record<string, string> {
  const allowed = parseAllowedOrigins();
  const origin = req.headers.get("Origin");
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  let allowOrigin = "*";
  if (allowed.length === 0) {
    allowOrigin = "*";
  } else if (allowed.includes("*")) {
    allowOrigin = "*";
  } else if (origin && allowed.includes(origin)) {
    allowOrigin = origin;
    base["Vary"] = "Origin";
  } else if (!origin) {
    allowOrigin = allowed[0] ?? "*";
  } else {
    allowOrigin = "null";
  }

  base["Access-Control-Allow-Origin"] = allowOrigin;
  if (allowOrigin !== "*" && allowOrigin !== "null") {
    base["Vary"] = "Origin";
  }
  return base;
}

/** @deprecated use corsHeadersForRequest(req) */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(
  body: unknown,
  status = 200,
  req?: Request,
): Response {
  const cors = req ? corsHeadersForRequest(req) : corsHeaders;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function internalServerError(cause?: unknown, req?: Request): Response {
  if (cause !== undefined) console.error(cause);
  return jsonResponse({ error: "Internal server error" }, 500, req);
}

export function emptyResponse(status: number, req: Request): Response {
  return new Response(null, { status, headers: corsHeadersForRequest(req) });
}
