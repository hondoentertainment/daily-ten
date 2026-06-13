# Security — rate limits, CORS, verification

## CORS

Edge Functions read **`ALLOWED_ORIGINS`** (comma-separated exact origins). Unset = `*` (development only).

Production: set to your Vercel production URL, preview URLs you use, and `http://localhost:5173` for local dev if needed.

## Submit rate limiting

`submit-result` records events in **`rate_limit_events`** (service role only).

| Secret | Default | Meaning |
|--------|---------|---------|
| `SUBMIT_RATE_LIMIT_USER_PER_MIN` | 30 | Max submissions per user per rolling minute |
| `SUBMIT_RATE_LIMIT_IP_PER_MIN` | 60 | Max submissions per client IP per rolling minute |

HTTP **429** includes `retry_after_seconds`.

## Manual verification (abuse smoke)

Replace placeholders and run in a shell (expect 429 after the limit):

```bash
# Repeat quickly with a real user JWT and puzzle_id
for i in $(seq 1 40); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    "$SUPABASE_URL/functions/v1/submit-result" \
    -H "Authorization: Bearer $USER_JWT" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"puzzle_id\":\"$PUZZLE_UUID\",\"answers\":[\"x\"]}"
done
```

## Admin payloads

Large `puzzle_payload` JSON can be rejected by platform body limits; keep payloads reasonable and validate in admin functions (already reject non-object / array).

## Scoring integrity

`submit-result` requires an **`answers`** array. The Edge Function reads **`puzzle_payload`** from Postgres and computes **score server-side** (aligned with `web/src/lib/puzzle-grade.ts` and `supabase/functions/_shared/daily-tens.ts`). Submitted scores are not taken from the client.
