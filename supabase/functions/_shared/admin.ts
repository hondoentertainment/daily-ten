import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ServiceClient = ReturnType<typeof createClient>;

export async function requireAdmin(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
): Promise<
  { ok: true; userId: string; admin: ServiceClient } | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      ),
    };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }),
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr || profile?.role !== "admin") {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }),
    };
  }

  return { ok: true, userId: user.id, admin };
}
