# Testing

## Quick reference

| Command | What it runs |
|---------|----------------|
| `npm test` | Vitest (web unit) + Deno (`_shared` Edge utilities) |
| `npm run test:unit:coverage` | Web unit tests with V8 coverage (`src/lib/`) |
| `npm run test:e2e` | Playwright against production build + `vite preview` |
| `npm run test:db` | pgTAP SQL tests (`supabase test db` — needs local DB) |
| `npm run test:all` | `npm test` then E2E |
| `npm run check:deploy` | Validates `web/.env` has `VITE_SUPABASE_*` (see script header for Node `--env-file`) |

## Web (Vitest)

- Tests live next to code: `web/src/**/*.test.ts`.
- Pure UI helpers: [`web/src/lib/html.ts`](../web/src/lib/html.ts), [`web/src/lib/leaderboard-view.ts`](../web/src/lib/leaderboard-view.ts).

## Edge Functions (Deno)

- [`supabase/functions/_shared/cors_test.ts`](../supabase/functions/_shared/cors_test.ts) — JSON/error behavior for shared handlers.
- [`supabase/functions/_shared/cors_origins_test.ts`](../supabase/functions/_shared/cors_origins_test.ts) — `ALLOWED_ORIGINS` allowlist parsing and `Access-Control-Allow-Origin` echoing.
- **Local:** `deno` comes from the root devDependency **`deno-bin`** (`npm run test:deno` uses `node_modules/.bin/deno`). You can still install [Deno](https://deno.com/) globally if you prefer.
- **CI:** uses `denoland/setup-deno` for a pinned runtime.

## E2E (Playwright)

- Specs in [`e2e/`](../e2e/): smoke (unconfigured shell) and **axe** (serious/critical a11y; color-contrast disabled until palette is audited end-to-end).
- First run: `npx playwright install chromium` (or `npx playwright install` for all browsers).
- `npm run test:e2e` runs `vite build` then `vite preview`; no Supabase env needed for default tests.
- **Optional auth E2E:** set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `E2E_AUTH_EMAIL`, and `E2E_AUTH_PASSWORD` in the environment **before** `npm run build` (so Vite embeds the URL/key) and run `npm run test:e2e`. [`e2e/authenticated.spec.ts`](../e2e/authenticated.spec.ts) is skipped when those are unset.

## PWA / install

- [`web/public/manifest.webmanifest`](../web/public/manifest.webmanifest) includes **icons** under `web/public/icons/`.
- [`web/public/sw.js`](../web/public/sw.js) — minimal **service worker** (production only): caches shell assets for faster repeat visits; API calls use the network. Registered from [`web/src/main.ts`](../web/src/main.ts) when `import.meta.env.PROD`.

## Database (pgTAP)

- Files in [`supabase/tests/database/`](../supabase/tests/database/).
- Run when Docker + `supabase start` (or linked remote) is available:

  ```bash
  npx supabase test db
  ```

- Extends database with **pgTAP** on first run (Supabase test harness).

## CI

GitHub Actions runs unit, Deno, E2E, build, and a **`database`** job (`npx supabase start` then `npx supabase test db`) — requires Docker on the runner. For local runs without Docker, use `npm test` and `npm run test:e2e` only.
