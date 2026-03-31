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

1. Open [vercel.com/new](https://vercel.com/new) and **Import** the GitHub repository.
2. Vercel reads root [`vercel.json`](../vercel.json): install `npm ci`, build `npm run build`, output **`web/dist`**.
3. **Environment variables** (Project → Settings → Environment Variables), for **Production** and **Preview**:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Project URL from Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key (safe for browser) |

4. Redeploy after adding env vars (**Deployments → … → Redeploy**).

`VITE_*` variables are inlined at **build** time. Changing them requires a new deployment.

## Supabase (separate from Vercel)

- Migrations and Edge Functions deploy to **Supabase**, not Vercel. See root [`README.md`](../README.md) and [`supabase/ADMIN_WORKFLOW.md`](../supabase/ADMIN_WORKFLOW.md).

## CLI alternatives

```bash
# Production deploy without Git (testing)
npx vercel deploy --prod
```

Linking the Git repo in the Vercel dashboard is recommended for continuous deployment on every push.
