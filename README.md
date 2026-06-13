# Daily Tens — Supabase backend

Postgres schema, RLS, seed data, and Edge Functions for the Daily Tens rebuild.

**Product spec and roadmap:** [docs/PRD.md](docs/PRD.md) (includes **`puzzle_payload` v1** for `daily_tens_v1`).  
**GitHub + Vercel:** [docs/DEPLOY.md](docs/DEPLOY.md).  
**Testing:** [docs/TESTING.md](docs/TESTING.md) — Vitest, Deno (`cors` + `ALLOWED_ORIGINS` allowlist tests), Playwright smoke + axe, optional **auth E2E** when `E2E_AUTH_*` + `VITE_*` are set before build; optional `npm run test:db` (pgTAP).  
**Quality scorecard & agents:** [docs/QUALITY_SCORECARD_AND_AGENTS.md](docs/QUALITY_SCORECARD_AND_AGENTS.md).  
**Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).  
**HTTP API (human + machine):** [docs/API.md](docs/API.md) · [docs/openapi.yaml](docs/openapi.yaml).  
**Security (CORS, rate limits, verification):** [docs/SECURITY.md](docs/SECURITY.md).

### Live

- **Repository:** [github.com/hondoentertainment/daily-ten](https://github.com/hondoentertainment/daily-ten)
- **Production site:** [daily-ten-orcin.vercel.app](https://daily-ten-orcin.vercel.app) — in Vercel set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**. **`VITE_SITE_URL`** is optional: Vercel production/preview builds auto-pick canonical/`og:url` from `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` when unset ([`web/vite.config.ts`](web/vite.config.ts)). Full go-live steps: **[docs/DEPLOY.md](docs/DEPLOY.md)** (checklist). Supabase: **Auth redirect URLs**, **`ALLOWED_ORIGINS`**, migrations, functions, published puzzle — [docs/SECURITY.md](docs/SECURITY.md).

## Quick start

1. Copy [`.env.example`](.env.example) (Supabase CLI / scripts) and [`web/.env.example`](web/.env.example) (`VITE_*` for the web app); fill in keys.
2. `npm install`
3. `npx supabase login` → `npx supabase link --project-ref <ref>`
4. `npm run db:push`
5. `npm run functions:deploy`

Operations and curl examples: [`supabase/ADMIN_WORKFLOW.md`](supabase/ADMIN_WORKFLOW.md).

## Multi-agent delivery (how to split work)

You can run **parallel Cursor agents** (or humans) on these slices with minimal overlap:

| Agent | Scope | Deliverable |
|--------|--------|-------------|
| **A — Schema** | `supabase/migrations/*.sql`, `seed.sql` | Tables, triggers, RLS, grants, `get_leaderboard` RPC, view definitions |
| **B — Edge API** | `supabase/functions/**` | HTTP handlers, JWT/admin gates, validation, CORS, safe error responses |
| **C — Delivery** | Root `package.json`, `.env.example`, CI, docs | Scripts, GitHub Actions, README, manual test notes (`supabase/tests/`) |

**Merge order:** land migrations first, then functions (they assume schema), then CI/docs.

**Contract between A and B:** Edge Functions rely on `puzzles`, `profiles`, `game_results` column names; `puzzles.play_date` stays unique; `game_results` allows many rows per user per puzzle (unlimited plays).

## Scripts

| Script | Purpose |
|--------|--------|
| `npm run db:push` | Apply migrations to linked project |
| `npm run db:reset` | Reset local DB (requires Docker + `supabase start`) |
| `npm run functions:deploy` | Deploy all four functions |

## Functions

- `get-daily-puzzle` — public read (published, not future)
- `submit-result` — authenticated submit (**`answers`** body; server grades from `puzzle_payload`)
- `admin-upsert-puzzle`, `admin-publish` — `profiles.role = admin`

Public leaderboard from the client: `rpc('get_leaderboard', { p_play_date: 'YYYY-MM-DD' })` (anon key allowed). Users may submit **unlimited** scores per puzzle; the leaderboard uses **each player’s best score** for that day.

**API note:** `submit-result` expects **`answers`** (ordered strings); the server computes **score** from the stored `puzzle_payload` — do not send a client-only `score` field.
