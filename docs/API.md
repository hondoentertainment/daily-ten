# Edge Functions API (JSON)

Machine-readable summary: [`openapi.yaml`](openapi.yaml). Security and rate limits: [`SECURITY.md`](SECURITY.md).

Base URL: `{SUPABASE_URL}/functions/v1`

Common headers for browser calls:

- `apikey: <SUPABASE_ANON_KEY>`
- `Authorization: Bearer <anon JWT>` (public functions) or **user** `access_token` (submit).

CORS: set `ALLOWED_ORIGINS` in function secrets (comma-separated). Empty = `*`.

---

## `get-daily-puzzle`

**Methods:** `GET`, `POST`

**GET query:** `play_date` optional `YYYY-MM-DD` (default: today UTC).

**POST body:** `{ "play_date": "YYYY-MM-DD" }` optional.

**200**

```json
{
  "puzzle": {
    "id": "uuid",
    "play_date": "2026-03-31",
    "puzzle_payload": { "type": "daily_tens_v1", "prompt": "…", "answers": ["…"] },
    "version": 1,
    "title": "…",
    "checksum": null
  }
}
```

**Errors:** `400` bad date, `404` not found, `405` method.

---

## `submit-result`

**Method:** `POST` only.

**Headers:** `Authorization: Bearer <user access_token>` (required).

**Body:**

```json
{
  "puzzle_id": "uuid",
  "answers": ["first answer", "second", "…"],
  "time_ms": 12345,
  "client_meta": {}
}
```

**`answers`** (required): ordered strings, same semantics as the play UI. The function loads the published puzzle’s `puzzle_payload`, grades with the same rules as the web client (`trim` + case-insensitive match per slot), and **persists only the server-computed score** (0–100). Clients cannot submit a raw `score`.

`time_ms` and `client_meta` optional.

**200**

```json
{
  "ok": true,
  "result": { "id": "uuid", "score": 85, "time_ms": 12000, "created_at": "…" },
  "leaderboard_hint": "…"
}
```

**Errors:** `401`, `404`, `429` rate limit, `400` validation.

---

## `admin-upsert-puzzle`

**Method:** `POST`. **Auth:** user JWT + `profiles.role = admin`.

**Body:**

```json
{
  "play_date": "2026-03-31",
  "puzzle_payload": {},
  "title": "string | null",
  "status": "draft | published",
  "version": 1,
  "checksum": "string | null"
}
```

**200:** `{ "puzzle": { …row } }`

---

## `admin-publish`

**Method:** `POST`. **Auth:** admin JWT.

**Body:** `{ "play_date": "2026-03-31", "status": "published" | "draft" }`

**200:** `{ "puzzle": { … } }`

---

## Postgres RPC

**`get_leaderboard(p_play_date date)`**

Callable with anon key. Returns set of `(rank, display_name, score, time_ms)` for best score per user that day.
