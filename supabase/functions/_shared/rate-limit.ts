import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type AdminClient = ReturnType<typeof createClient>;

const WINDOW_MS = 60_000;

function limitFromEnv(name: string, fallback: number): number {
  const v = Deno.env.get(name);
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/** Returns true if under limit, false if rate limited. */
export async function checkSubmitRateLimit(
  admin: AdminClient,
  userId: string,
  ip: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const maxUser = limitFromEnv("SUBMIT_RATE_LIMIT_USER_PER_MIN", 30);
  const maxIp = limitFromEnv("SUBMIT_RATE_LIMIT_IP_PER_MIN", 60);
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();

  await admin.from("rate_limit_events").delete().lt(
    "created_at",
    new Date(Date.now() - WINDOW_MS * 3).toISOString(),
  );

  const userBucket = `submit:user:${userId}`;
  const ipBucket = `submit:ip:${ip}`;

  const { count: userCount, error: e1 } = await admin
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("bucket", userBucket)
    .gte("created_at", cutoff);

  if (e1) console.error("rate_limit user count", e1);

  const { count: ipCount, error: e2 } = await admin
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("bucket", ipBucket)
    .gte("created_at", cutoff);

  if (e2) console.error("rate_limit ip count", e2);

  const uc = userCount ?? 0;
  const ic = ipCount ?? 0;

  if (uc >= maxUser || ic >= maxIp) {
    return { ok: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }

  const { error: insErr } = await admin.from("rate_limit_events").insert([
    { bucket: userBucket },
    { bucket: ipBucket },
  ]);
  if (insErr) {
    console.error("rate_limit insert", insErr);
  }

  return { ok: true };
}
