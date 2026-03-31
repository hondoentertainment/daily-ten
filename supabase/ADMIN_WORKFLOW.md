# Admin workflow (Daily Tens backend)

## Supabase Studio

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor** or **Table Editor**.
2. Run migrations (`npx supabase db push` or paste SQL from `supabase/migrations/` if you manage manually).
3. **Content**: edit `public.puzzles` rows (`play_date`, `puzzle_payload`, `status`). Prefer **`published`** only when the puzzle should be visible to players (`play_date` must be ≤ today UTC for anon read policy).
4. **Users**: `public.profiles` is created automatically when a user signs up (Auth → Users).

## Grant admin (required for Edge Functions)

After your account exists in **Authentication → Users**, copy your user UUID and run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'YOUR_AUTH_USER_UUID';
```

Only `role = 'admin'` can call `admin-upsert-puzzle` and `admin-publish`.

## Edge Functions (curl)

Replace `PROJECT_REF`, `ANON_JWT` (signed-in user), and payloads.

**Upsert puzzle (admin JWT):**

```bash
curl -s -X POST \
  "https://PROJECT_REF.supabase.co/functions/v1/admin-upsert-puzzle" \
  -H "Authorization: Bearer ANON_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"play_date\":\"2026-03-31\",\"status\":\"draft\",\"puzzle_payload\":{\"clues\":[]},\"title\":\"Draft\"}"
```

**Publish / unpublish (admin JWT):**

```bash
curl -s -X POST \
  "https://PROJECT_REF.supabase.co/functions/v1/admin-publish" \
  -H "Authorization: Bearer ANON_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"play_date\":\"2026-03-31\",\"status\":\"published\"}"
```

**Public puzzle (no JWT):**

```bash
curl -s "https://PROJECT_REF.supabase.co/functions/v1/get-daily-puzzle?play_date=2026-03-31"
```

**Submit result (user JWT):**

```bash
curl -s -X POST \
  "https://PROJECT_REF.supabase.co/functions/v1/submit-result" \
  -H "Authorization: Bearer USER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"puzzle_id\":\"PUZZLE_UUID\",\"score\":10,\"time_ms\":12000}"
```

## Optional minimal admin UI

Point any small SPA or static page at the same URLs as above. Store the admin session JWT from Supabase Auth (`signInWithPassword`, etc.) and send it in `Authorization: Bearer …` for admin routes only. Do not ship the service role key to the browser.

## Public leaderboard from the client

Each user may play and submit **unlimited** times per puzzle; `get_leaderboard` ranks **best score per user** for that puzzle date (tie-break: faster `time_ms`).

With the **anon** key, call the RPC (no Edge Function required):

```ts
const { data, error } = await supabase.rpc("get_leaderboard", {
  p_play_date: "2026-03-31",
});
```

## Linking the CLI

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy get-daily-puzzle submit-result admin-upsert-puzzle admin-publish
```

Set function secrets in Dashboard → **Edge Functions → Secrets** if anything is missing; hosted functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically.
