import { assertEquals } from "jsr:@std/assert@1";
import { corsHeadersForRequest, parseAllowedOrigins } from "./cors.ts";

function withEnv(key: string, value: string | undefined, fn: () => void) {
  const prev = Deno.env.get(key);
  if (value === undefined) Deno.env.delete(key);
  else Deno.env.set(key, value);
  try {
    fn();
  } finally {
    if (prev === undefined) Deno.env.delete(key);
    else Deno.env.set(key, prev);
  }
}

Deno.test("parseAllowedOrigins splits comma list", () => {
  withEnv("ALLOWED_ORIGINS", "https://a.com, https://b.com", () => {
    assertEquals(parseAllowedOrigins(), ["https://a.com", "https://b.com"]);
  });
});

Deno.test("corsHeadersForRequest echoes matching Origin", () => {
  withEnv("ALLOWED_ORIGINS", "https://app.example", () => {
    const req = new Request("http://local", {
      headers: { Origin: "https://app.example" },
    });
    const h = corsHeadersForRequest(req);
    assertEquals(h["Access-Control-Allow-Origin"], "https://app.example");
  });
});

Deno.test("corsHeadersForRequest uses * when ALLOWED_ORIGINS unset", () => {
  withEnv("ALLOWED_ORIGINS", undefined, () => {
    const req = new Request("http://local", {
      headers: { Origin: "https://any.com" },
    });
    const h = corsHeadersForRequest(req);
    assertEquals(h["Access-Control-Allow-Origin"], "*");
  });
});
