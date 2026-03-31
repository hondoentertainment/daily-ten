# Daily Tens — Supabase backend

Postgres schema, RLS, seed data, and Edge Functions for the Daily Tens rebuild.

**Product spec and roadmap:** [docs/PRD.md](docs/PRD.md).  
**GitHub + Vercel:** [docs/DEPLOY.md](docs/DEPLOY.md).

## Quick start

1. Copy [`.env.example`](.env.example) and fill in project keys.
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
- `submit-result` — authenticated submit
- `admin-upsert-puzzle`, `admin-publish` — `profiles.role = admin`

Public leaderboard from the client: `rpc('get_leaderboard', { p_play_date: 'YYYY-MM-DD' })` (anon key allowed). Users may submit **unlimited** scores per puzzle; the leaderboard uses **each player’s best score** for that day.
