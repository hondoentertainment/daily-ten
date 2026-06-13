# Deploy: GitHub + Vercel

## GitHub

1. Ensure commits are on `main` (or your default branch).
2. Remote: `origin` → `https://github.com/<org>/<repo>.git`
3. Push: `git push -u origin main`

Create a new repo from this folder (if not done yet):

```bash
git init
git add .
git commit -m "chore: initial Daily Tens monorepo (Supabase + Vite web)"
gh repo create <your-repo-name> --public --source=. --remote=origin --push
```

## Vercel

This repo is already wired for Vercel: root [`vercel.json`](../vercel.json) builds `web/dist`. If you import fresh:

1. Open [vercel.com/new](https://vercel.com/new) and **Import** the GitHub repository ([hondoentertainment/daily-ten](https://github.com/hondoentertainment/daily-ten)).
2. Vercel reads root [`vercel.json`](../vercel.json): install `npm ci`, build `npm run build`, output **`web/dist`**.
3. **Environment variables** (Project → Settings → Environment Variables), for **Production** and **Preview**:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Project URL from Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key (safe for browser) |
| `VITE_SITE_URL` | **Recommended.** Public site origin with no trailing slash, e.g. `https://your-app.vercel.app`. At build time, Vite injects `<link rel="canonical">` and `<meta property="og:url">` into `index.html`. Omit for local dev if you do not need canonical tags in the preview build. |

4. Redeploy after adding env vars (**Deployments → … → Redeploy**).

`VITE_*` variables are inlined at **build** time. Changing them requires a new deployment.

5. In **Supabase** → Authentication → URL configuration, add your Vercel URL (e.g. `https://daily-ten-orcin.vercel.app`) to **Site URL** and **Redirect URLs** if you use email magic links or OAuth.

6. **Edge Function secrets** (Supabase Dashboard → Edge Functions → Secrets): set **`ALLOWED_ORIGINS`** to a comma-separated list of allowed browser origins (production + preview URLs + `http://localhost:5173` if needed). Unset = `*` (development only). Optional: **`SUBMIT_RATE_LIMIT_USER_PER_MIN`**, **`SUBMIT_RATE_LIMIT_IP_PER_MIN`** (defaults documented in [`SECURITY.md`](SECURITY.md)). Full notes: [`docs/SECURITY.md`](SECURITY.md).

## Supabase (separate from Vercel)

- Migrations and Edge Functions deploy to **Supabase**, not Vercel. See root [`README.md`](../README.md), [`supabase/ADMIN_WORKFLOW.md`](../supabase/ADMIN_WORKFLOW.md), and [`docs/SECURITY.md`](SECURITY.md).

## CLI alternatives

```bash
# Production deploy without Git (testing)
npx vercel deploy --prod
```

Linking the Git repo in the Vercel dashboard is recommended for continuous deployment on every push.

---

## Production checklist (Vercel + Supabase)

Use this when going live or after importing the repo. Order matters where noted.

### 1. Vercel — environment variables

In **Project → Settings → Environment Variables**, for **Production** (and **Preview** if players hit preview URLs):

| Variable | Production | Preview |
|----------|------------|---------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Same or separate Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Anon **public** key | Same |
| `VITE_SITE_URL` | Optional. Stable canonical host, e.g. `https://daily-ten-orcin.vercel.app` or your custom domain **without** trailing slash | Optional; overrides auto URL below |

**Canonical / `og:url` without `VITE_SITE_URL`:** The Vite build uses Vercel’s **`VERCEL_PROJECT_PRODUCTION_URL`** on production builds and **`VERCEL_URL`** on preview builds (see [`web/vite.config.ts`](../web/vite.config.ts)). Set `VITE_SITE_URL` when you want a fixed marketing domain that differs from the auto value.

After any change: **Deployments → … → Redeploy**.

### 2. Supabase — Authentication URLs

**Authentication → URL configuration** (same project as `VITE_SUPABASE_URL`):

- **Site URL:** `https://daily-ten-orcin.vercel.app` (or your production origin).
- **Redirect URLs:** add at least:
  - `https://daily-ten-orcin.vercel.app/**`
  - `https://daily-ten-orcin.vercel.app`
  - Each **preview** origin you use (e.g. `https://<deployment>.vercel.app/**`), or a stable preview domain.
  - `http://localhost:5173/**` for local dev against cloud Auth.

Save; no redeploy of Edge Functions required for this step alone.

### 3. Supabase — Edge Function secrets

**Project Settings → Edge Functions → Secrets** (or CLI secrets):

| Secret | Example / note |
|--------|----------------|
| `ALLOWED_ORIGINS` | Comma-separated **exact** origins. Example: `https://daily-ten-orcin.vercel.app,https://<preview-deployment>.vercel.app,http://localhost:5173` — list every hostname the browser uses. Unset = `*` (dev only). |
| `SUBMIT_RATE_LIMIT_USER_PER_MIN` | Optional; default `30` ([`SECURITY.md`](SECURITY.md)). |
| `SUBMIT_RATE_LIMIT_IP_PER_MIN` | Optional; default `60`. |

Then redeploy functions: `npm run functions:deploy` (or Dashboard).

### 4. Supabase — schema and content

- `npm run db:push` (or Dashboard SQL) so **migrations** match this repo.
- `npm run functions:deploy` for **Edge Functions**.
- Ensure a **published** puzzle exists for today’s UTC `play_date` (see [`supabase/ADMIN_WORKFLOW.md`](../supabase/ADMIN_WORKFLOW.md)) or players see “not found” / empty leaderboard.

### 5. Verify

- Open production URL → should load puzzle UI (not “Add environment variables…”).
- Sign in / sign up from production origin.
- Submit an answer set → **Network** tab: `submit-result` returns **200** (not CORS or 429).
- Optional: `npm run check:deploy` locally (see root `package.json`) after copying `web/.env` from Vercel values.
