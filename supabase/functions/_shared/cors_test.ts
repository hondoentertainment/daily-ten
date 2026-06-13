import { assertEquals } from "jsr:@std/assert@1";
import { corsHeaders, internalServerError, jsonResponse } from "./cors.ts";

Deno.test("jsonResponse includes CORS and JSON body", async () => {
  const r = jsonResponse({ ok: true }, 201);
  assertEquals(r.status, 201);
  assertEquals(r.headers.get("Content-Type"), "application/json");
  assertEquals(r.headers.get("Access-Control-Allow-Origin"), corsHeaders["Access-Control-Allow-Origin"]);
  assertEquals(await r.json(), { ok: true });
});

Deno.test("internalServerError hides cause message from client", async () => {
  const r = internalServerError(new Error("database connection refused"));
  assertEquals(r.status, 500);
  const body = await r.json() as { error: string };
  assertEquals(body.error, "Internal server error");
  assertEquals(JSON.stringify(body).includes("database"), false);
});
