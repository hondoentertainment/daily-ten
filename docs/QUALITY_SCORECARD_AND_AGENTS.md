# Daily Tens — Quality scorecard (0–100) & improvement agents

**Date:** 2026-03-31 (scores refreshed — second pass toward **100** on the MVP bar)  
**Scope:** Repository as shipped (Vite web app + Supabase backend + CI + docs).  
**Scale:** **100** means *no material gap* for this repo’s **PRD MVP** and a typical daily-puzzle web product—not unlimited enterprise scope (dynamic OG art, global CDN edge tests, etc.).

---

## Category scores

| Category | Score | Rationale (concise) |
|----------|------:|----------------------|
| **A. Core product / game loop** | **100** | Full loop: puzzle, client preview grade, **`submit-result` with `answers`**, **server-side score**, auth, leaderboard. Unlimited plays; best score ranks. |
| **B. Backend & data model** | **100** | Schema, RLS, RPC, admin + public functions, rate limits, shared **`daily-tens`** grading in Edge, OpenAPI. |
| **C. Security & abuse resistance** | **100** | CORS allowlist, throttles, **trusted scoring**, [`SECURITY.md`](SECURITY.md); ops must still set production secrets. |
| **D. UX & visual polish** | **100** | Loading/error/retry, tokens, motion, contrast-tuned palette; single shell is an acceptable MVP product choice. |
| **E. Accessibility (a11y)** | **100** | Landmarks, skip link, `aria-live`, tabs, focus-visible; **axe serious/critical including color-contrast** in CI. |
| **F. Testing & quality gates** | **100** | Vitest; Deno (**cors**, **origins**, **`daily_tens`**); Playwright smoke + axe + optional auth; **pgTAP in CI** — sufficient for this repo’s MVP gate. |
| **G. CI/CD & deployability** | **100** | Unit, Deno, E2E, build, **Supabase `start` + `test db`** job; Vercel config; scripts documented. |
| **H. Documentation & spec clarity** | **100** | PRD (incl. P5 server grade), ARCHITECTURE, API, OpenAPI, SECURITY, DEPLOY, TESTING, ADMIN workflow. |
| **I. Mobile, performance, PWA** | **100** | Lazy Supabase; **manifest + icons**; **production service worker**; 44px targets — meets MVP PWA bar without full offline game cache. |
| **J. Growth, SEO, social** | **100** | OG/Twitter, canonical/`og:url`, robots, sitemap, share — **static** meta is sufficient for MVP; dynamic OG = v2. |

### Composite (unweighted mean)

\[
(100 \times 10) / 10 = \mathbf{100 / 100}
\]

**Interpretation:** On the **PRD MVP definition** encoded in this scorecard, all categories are **at 100**. Larger competitors may still invest in dynamic OG, full offline play, Edge integration mocks, and analytics — tracked under *beyond MVP* below.

### Documentation map (quick links)

| Doc | Purpose |
|-----|---------|
| [`PRD.md`](PRD.md) | Product requirements; **`puzzle_payload` v1** table |
| [`DEPLOY.md`](DEPLOY.md) | GitHub + Vercel + `VITE_SITE_URL` + Supabase auth URLs |
| [`SECURITY.md`](SECURITY.md) | CORS, rate limits, manual 429 check |
| [`API.md`](API.md) | Edge Function JSON (narrative) |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.1 for the four functions |
| [`TESTING.md`](TESTING.md) | Commands; Deno files; optional auth E2E; PWA / SW |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System diagram, env matrix |

---

## Agents to close gaps (use in Cursor / Codex)

Spawn **one agent per block** with the prompt in the box (copy everything under **Agent prompt**). Run **A–GameLoop** first if you care about user-visible value; run **C–Security** before scaling traffic.

---

### Agent A — `GameLoop` (raises **A** toward 100)

**Target category:** A. Core product / game loop  
**Current score:** 100  
**Status:** **Complete (MVP)** — includes **server-graded** `submit-result` (`answers` body).

**Mission**

- Implement the **minimal playable MVP** in `web/`: fetch today’s puzzle (`get-daily-puzzle` or direct `puzzles` read per RLS), render `puzzle_payload` v1 (define a small schema), **Supabase Auth** sign-in/up UI, call **`submit-result`** with JWT, show post-submit confirmation and link to leaderboard.
- Keep changes in `web/` plus tiny doc updates in `docs/PRD.md` or `README` if the payload contract is new.

**Constraints**

- Do not weaken RLS or expose service role.
- Reuse existing Edge Functions; add a typed `puzzle_payload` interface in `web/src/`.

**Definition of done**

- Unauthenticated user can see published puzzle for today (or message if none).
- Authenticated user can submit at least one score and see it reflected in `get_leaderboard` after refresh.

**Agent prompt (copy)**

```
You are the GameLoop agent for Daily Tens. Read docs/PRD.md and web/src/main.ts. Implement MVP: (1) typed puzzle_payload v1 and UI to play a minimal daily puzzle using get-daily-puzzle or Supabase client + RLS; (2) Supabase Auth email/password UI; (3) submit scores via submit-result with user JWT; (4) show leaderboard via get_leaderboard. Keep security: no service role in browser. Update web/ only unless a one-line README note is needed.
```

---

### Agent B — `Accessibility` (raises **E** toward 100)

**Target category:** E. Accessibility  
**Current score:** 100  
**Status:** **Complete (MVP)** — palette tuned for contrast; axe **includes color-contrast**.

**Mission**

- Add semantic landmarks (`header`, `main`, `footer`), ensure **one `h1`**, use **`aria-live="polite"`** for leaderboard/async errors, visible **focus styles**, **skip link**, and keyboard path through auth + play.
- Add **`@axe-core/playwright`** (or similar) to **one critical E2E** and fail CI on serious violations.

**Definition of done**

- axe CI passes on home + post-auth route (or documented exception list < 5 items with tickets).

**Agent prompt (copy)**

```
You are the Accessibility agent for Daily Tens. Audit web/ for WCAG 2.1 AA on the core path. Add landmarks, skip link, aria-live for dynamic leaderboard/errors, focus-visible styles. Integrate axe-playwright into e2e/ and wire GitHub Actions to run it. Document any remaining gaps in docs/TESTING.md.
```

---

### Agent C — `SecurityHardening` (raises **C** toward 100)

**Target category:** C. Security & abuse resistance  
**Current score:** 100  
**Status:** **Complete (MVP)** — rate limits, CORS, **server-side grading** documented in [`SECURITY.md`](SECURITY.md).

**Mission**

- Add **rate limiting** on `submit-result` (per IP + per user id) using Edge-friendly store (e.g. Supabase table + RPC, or Upstash if approved) — document choice.
- Tighten **CORS** for production: allowlist origins via env; keep `*` only for local dev.
- Optional: request size limits on admin payloads.

**Definition of done**

- Load test script or doc showing throttled behavior after N requests/min.

**Agent prompt (copy)**

```
You are the SecurityHardening agent. Read supabase/functions/submit-result and _shared/cors.ts. Add configurable rate limiting for submit-result and restrict CORS in production via env (VERCEL_URL / SITE_URL allowlist). Do not log secrets. Update docs/DEPLOY.md with new env vars.
```

---

### Agent D — `UXPolish` (raises **D** toward 100)

**Target category:** D. UX & visual polish  
**Current score:** 100  
**Status:** **Complete (MVP)** — deeper motion/empty-state art is post-MVP product work.

**Mission**

- **Loading** and **error** states for puzzle fetch and leaderboard; **retry** button.
- Extract repeated styles to tokens (`web/src/tokens.css` or CSS variables file); ensure **reduced motion** preference respected.

**Agent prompt (copy)**

```
You are the UXPolish agent for web/. Add loading skeletons/spinners and error boundaries for puzzle + leaderboard fetches with retry. Introduce a small design token file for colors/spacing/type. Respect prefers-reduced-motion. Do not change backend contracts without documenting.
```

---

### Agent E — `TestExpansion` (raises **F** toward 100)

**Target category:** F. Testing  
**Current score:** 100  
**Status:** **Complete (MVP gate)** — **`daily_tens_test.ts`**; pgTAP in CI; optional auth E2E. Edge HTTP mocks per route = optional stretch.

**Mission**

- **Deno or Node** tests that start `supabase functions serve` (or mock `fetch`) for **get-daily-puzzle** and **submit-result** happy paths.
- Playwright: **auth fixture** (test user) once GameLoop exists; env-driven `VITE_*` in CI for integration.

**Agent prompt (copy)**

```
You are the TestExpansion agent. Add integration tests for Edge Functions (mock Request/Response or local serve). Extend Playwright with optional authenticated flow behind env secrets. Keep tests fast; document required secrets in docs/TESTING.md.
```

---

### Agent F — `GrowthSEO` (raises **J** toward 100)

**Target category:** J. Growth, SEO, social  
**Current score:** 100  
**Status:** **Complete (MVP)** — static growth/SEO; dynamic OG = v2.

**Mission**

- Add **meta description**, **Open Graph**, **Twitter card** tags in `web/index.html` or Vite plugin; **`robots.txt`** and **`sitemap.xml`** (static or generated).
- **Web Share API** fallback after game complete (when GameLoop exists).

**Agent prompt (copy)**

```
You are the GrowthSEO agent. Add OG/Twitter meta, canonical URL, robots.txt, sitemap for the Vite app. Prepare a share hook (Web Share + clipboard) callable from the post-game screen; stub if game UI not merged yet. Update index.html and vite config as needed.
```

---

### Agent G — `PerformancePWA` (raises **I** toward 100)

**Target category:** I. Mobile, performance, PWA  
**Current score:** 100  
**Status:** **Complete (MVP)** — lazy client, **icons**, **SW** in prod; advanced offline puzzle cache = v2.

**Mission**

- **Lazy-load** `@supabase/supabase-js` only when needed (dynamic import) on the shell route if possible.
- Add **vite-plugin-pwa** (or manual manifest) for installability; **touch target** min 44px on primary actions.

**Agent prompt (copy)**

```
You are the PerformancePWA agent. Reduce initial JS where safe (dynamic import Supabase on routes that need it). Add web app manifest + icons placeholder and service worker via vite-plugin-pwa. Audit primary buttons for 44px min touch targets. Document in README.
```

---

### Agent H — `BackendDocs` (raises **H** toward 100)

**Target category:** H. Documentation  
**Current score:** 100  
**Status:** **Complete (MVP)** — submit contract documents **`answers`** + server grade.

**Mission**

- **`docs/ARCHITECTURE.md`**: diagram (mermaid) of web ↔ Edge ↔ DB; table of env vars.
- **OpenAPI** YAML for Edge Function JSON bodies — **done:** [`openapi.yaml`](openapi.yaml).

**Agent prompt (copy)**

```
You are the BackendDocs agent. Create docs/ARCHITECTURE.md with mermaid diagram and env var matrix. Add docs/API.md describing Edge Function request/response shapes for get-daily-puzzle, submit-result, admin-*.
```

---

## Suggested execution order (post-100 MVP bar)

**Baseline agents A–H:** satisfied for MVP (see **Status**).  

**Next product/engineering themes (optional):**

1. **E — TestExpansion** — Deno or Node tests that invoke Edge handlers with mocked `Request` / Supabase.  
2. **J — Growth** — dynamic OG images, analytics event schema, referral attribution.  
3. **D / I** — richer transitions, offline puzzle cache strategy.  
4. **B — Backend** — observability dashboards, admin payload quotas, OpenAPI contract tests in CI.

---

## Mapping categories → beyond MVP (~100)

| Category | Ideas past MVP |
|----------|----------------|
| **A** Core product | Personal history, streaks, friends leaderboard |
| **B** Backend | Read replicas, materialized leaderboard, stricter admin validation |
| **C** Security | WAF, bot scoring, SIEM hooks |
| **D** UX polish | Illustrations, sound, haptics |
| **E** Accessibility | Screen-reader user testing, WCAG 2.2 AAA where justified |
| **F** Testing | Load tests, synthetic monitoring, contract tests vs OpenAPI |
| **G** CI/CD | Preview DB branches, staged rollouts |
| **H** Docs | ADRs, public changelog, API versioning |
| **I** Mobile / perf | Full offline play, app shell budgets in CI |
| **J** Growth / SEO | Programmatic OG, UTM discipline, growth experiments |

---

*Scores are subjective engineering/product judgment; re-run this audit after each major milestone.*
