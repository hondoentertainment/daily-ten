import { leaderboardSectionInnerHtml } from "../lib/leaderboard-view";
import { gradeOrderedAnswers } from "../lib/puzzle-grade";
import { parseDailyTensPayload } from "../lib/puzzle-types";
import { functionsBaseUrl, getSupabase } from "../lib/supabase-lazy";
import { shareText } from "../lib/share";
import "../style.css";

type Tab = "play" | "leaderboard" | "account";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function boot(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app")!;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anon) {
    root.innerHTML = `
      <a href="#main" class="skip-link">Skip to main content</a>
      <header class="site-header"><h1>Daily Tens</h1></header>
      <main id="main" class="wrap" tabindex="-1">
        <p class="lede">Add environment variables to connect Supabase.</p>
        <ul class="check">
          <li><code>VITE_SUPABASE_URL</code></li>
          <li><code>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p class="muted">See <code>docs/DEPLOY.md</code>.</p>
      </main>`;
    return;
  }

  let currentTab: Tab = "play";
  let puzzleLoading = false;
  let puzzleError: string | null = null;
  let puzzleId: string | null = null;
  let parsed: ReturnType<typeof parseDailyTensPayload> = null;
  let gameStartedAt = 0;
  let lastGraded: { score: number; correctCount: number } | null = null;
  let sessionEmail: string | null = null;

  const liveRegion = document.createElement("div");
  liveRegion.className = "live-region";
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");

  function announce(msg: string): void {
    liveRegion.textContent = msg;
  }

  async function refreshSession(): Promise<void> {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    sessionEmail = data.session?.user.email ?? null;
  }

  async function loadPuzzle(): Promise<void> {
    puzzleLoading = true;
    puzzleError = null;
    puzzleId = null;
    parsed = null;
    lastGraded = null;
    gameStartedAt = Date.now();
    render();
    try {
      const res = await fetch(
        `${functionsBaseUrl()}/get-daily-puzzle?play_date=${utcToday()}`,
        {
          headers: {
            apikey: anon,
            Authorization: `Bearer ${anon}`,
          },
        },
      );
      const json = (await res.json()) as { puzzle?: { id: string; puzzle_payload: unknown }; error?: string };
      if (!res.ok) {
        puzzleError = json.error ?? `HTTP ${res.status}`;
        announce(`Error loading puzzle: ${puzzleError}`);
      } else if (json.puzzle) {
        puzzleId = json.puzzle.id;
        parsed = parseDailyTensPayload(json.puzzle.puzzle_payload);
        if (!parsed) {
          puzzleError = "Unsupported puzzle format.";
          announce(puzzleError);
        } else {
          announce("Puzzle loaded.");
        }
      }
    } catch (e) {
      puzzleError = e instanceof Error ? e.message : "Network error";
      announce(`Error: ${puzzleError}`);
    } finally {
      puzzleLoading = false;
      render();
    }
  }

  async function loadLeaderboardHtml(): Promise<{
    html: string;
    hadError: boolean;
  }> {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc("get_leaderboard", {
      p_play_date: utcToday(),
    });
    const html = leaderboardSectionInnerHtml(error, data as never);
    return { html, hadError: !!error };
  }

  async function submitScore(userAnswers: string[]): Promise<string | null> {
    if (!puzzleId) return "No puzzle.";
    const sb = await getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return "Sign in to submit your score.";
    const timeMs = Math.max(0, Date.now() - gameStartedAt);
    const res = await fetch(`${functionsBaseUrl()}/submit-result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: anon,
      },
      body: JSON.stringify({
        puzzle_id: puzzleId,
        answers: userAnswers,
        time_ms: timeMs,
      }),
    });
    const json = (await res.json()) as { error?: string; ok?: boolean };
    if (!res.ok) {
      return json.error ?? `Submit failed (${res.status})`;
    }
    announce("Score submitted.");
    return null;
  }

  function render(): void {
    const tabs: { id: Tab; label: string }[] = [
      { id: "play", label: "Play" },
      { id: "leaderboard", label: "Leaderboard" },
      { id: "account", label: "Account" },
    ];

    let playContent = "";
    if (puzzleLoading) {
      playContent = `<p class="muted">Loading today’s puzzle…</p>
        <div class="skeleton" style="width:100%;margin-bottom:0.5rem"></div>
        <div class="skeleton" style="width:80%"></div>`;
    } else if (puzzleError) {
      playContent = `<div class="error-banner" role="alert">${escapeAttr(puzzleError)}</div>
        <button type="button" class="btn" data-action="retry-puzzle">Retry</button>`;
    } else if (parsed && puzzleId) {
      const inputs = parsed.answers
        .map(
          (_, i) =>
            `<label>Answer ${i + 1}<input type="text" name="ans-${i}" autocomplete="off" /></label>`,
        )
        .join("");
      playContent = `<p class="lede">${escapeAttr(parsed.prompt)}</p>
        <div class="answer-grid form-stack">${inputs}</div>
        <p class="muted">Enter answers in order. Unlimited tries; leaderboard uses your <strong>best</strong> score today.</p>
        <button type="button" class="btn" data-action="grade">Check answers</button>
        <div id="grade-result" class="panel" style="display:none;margin-top:1rem"></div>
        <div id="submit-row" style="margin-top:1rem;display:none">
          <button type="button" class="btn" data-action="submit-score">Submit score</button>
          <button type="button" class="btn btn-secondary" data-action="share" style="margin-left:0.5rem">Share</button>
        </div>`;
    }

    root.innerHTML = `
      <a href="#main" class="skip-link">Skip to main content</a>
      <header class="site-header"><h1>Daily Tens</h1></header>
      <main id="main" class="wrap" tabindex="-1">
        <nav aria-label="Main">
          <ul class="nav-tabs" role="tablist">
            ${tabs
              .map((t) => {
                const panelId = `panel-${t.id}`;
                const tabId = `tab-${t.id}`;
                return `<li role="presentation"><button type="button" role="tab" id="${tabId}" data-tab="${t.id}" aria-selected="${t.id === currentTab}" aria-controls="${panelId}">${t.label}</button></li>`;
              })
              .join("")}
          </ul>
        </nav>
        <section id="panel-play" role="tabpanel" aria-labelledby="tab-play" ${currentTab !== "play" ? 'hidden' : ""}>
          <h2 class="page-title">Today</h2>
          ${playContent}
        </section>
        <section id="panel-leaderboard" role="tabpanel" aria-labelledby="tab-leaderboard" ${currentTab !== "leaderboard" ? 'hidden' : ""}>
          <h2 class="page-title">Leaderboard</h2>
          <div id="leaderboard-mount"><p class="muted">Loading…</p></div>
          <button type="button" class="btn btn-secondary" data-action="refresh-board" style="margin-top:1rem">Refresh</button>
        </section>
        <section id="panel-account" role="tabpanel" aria-labelledby="tab-account" ${currentTab !== "account" ? 'hidden' : ""}>
          <h2 class="page-title">Account</h2>
          <div id="account-mount"></div>
        </section>
      </main>
      <footer class="site-footer"><a href="/">Daily Tens</a> · <code>docs/PRD.md</code></footer>`;

    const mainEl = root.querySelector("#main");
    if (mainEl) {
      if (mainEl.firstChild) mainEl.insertBefore(liveRegion, mainEl.firstChild);
      else mainEl.appendChild(liveRegion);
    }

    root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentTab = (btn as HTMLButtonElement).dataset.tab as Tab;
        render();
        void onTabVisible();
      });
    });

    root.querySelector("[data-action=\"retry-puzzle\"]")?.addEventListener("click", () => {
      void loadPuzzle();
    });

    root.querySelector("[data-action=\"grade\"]")?.addEventListener("click", () => {
      if (!parsed) return;
      const userAnswers: string[] = [];
      for (let i = 0; i < parsed.answers.length; i++) {
        const el = root.querySelector<HTMLInputElement>(`input[name="ans-${i}"]`);
        userAnswers.push(el?.value ?? "");
      }
      const { score, correctCount } = gradeOrderedAnswers(parsed.answers, userAnswers);
      lastGraded = { score, correctCount };
      const gr = root.querySelector("#grade-result");
      const sr = root.querySelector("#submit-row");
      if (gr) {
        gr.style.display = "block";
        gr.innerHTML = `<p><strong>${correctCount}</strong> / ${parsed.answers.length} correct → score <strong>${score}</strong> / 100</p>`;
      }
      sr?.setAttribute("style", "margin-top:1rem;display:block");
      announce(`Graded: ${score} out of 100.`);
    });

    root.querySelector("[data-action=\"submit-score\"]")?.addEventListener("click", async () => {
      if (lastGraded == null || !parsed) {
        announce("Check answers first.");
        return;
      }
      const userAnswers: string[] = [];
      for (let i = 0; i < parsed.answers.length; i++) {
        const el = root.querySelector<HTMLInputElement>(`input[name="ans-${i}"]`);
        userAnswers.push(el?.value ?? "");
      }
      const err = await submitScore(userAnswers);
      if (err) {
        announce(err);
        alert(err);
      } else {
        alert("Score saved. Check the Leaderboard tab.");
      }
    });

    root.querySelector("[data-action=\"share\"]")?.addEventListener("click", async () => {
      if (lastGraded == null) return;
      const line = `Daily Tens ${utcToday()}: ${lastGraded.score}/100 (${lastGraded.correctCount} correct). dailytens.com`;
      try {
        await shareText("Daily Tens", line);
        announce("Shared or copied to clipboard.");
      } catch {
        announce("Could not share.");
      }
    });

    root.querySelector("[data-action=\"refresh-board\"]")?.addEventListener("click", () => {
      void mountLeaderboard();
    });

    void onTabVisible();
    renderAccount();
  }

  async function mountLeaderboard(): Promise<void> {
    const mount = root.querySelector("#leaderboard-mount");
    if (!mount) return;
    mount.innerHTML = "<p class=\"muted\">Loading…</p>";
    announce("Loading leaderboard.");
    try {
      const { html, hadError } = await loadLeaderboardHtml();
      const retry = hadError
        ? `<p style="margin-top:0.75rem"><button type="button" class="btn" data-action="retry-leaderboard">Retry</button></p>`
        : "";
      mount.innerHTML = `<div class="panel"><h2 class="sr-only">Rankings</h2>${html}</div>${retry}`;
      announce(hadError ? "Leaderboard could not load." : "Leaderboard updated.");
      mount.querySelector("[data-action=\"retry-leaderboard\"]")?.addEventListener("click", () => {
        void mountLeaderboard();
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      mount.innerHTML = `<p class="error-banner" role="alert">${escapeAttr(msg)}</p>
        <button type="button" class="btn" data-action="retry-leaderboard">Retry</button>`;
      announce(`Leaderboard error: ${msg}`);
      mount.querySelector("[data-action=\"retry-leaderboard\"]")?.addEventListener("click", () => {
        void mountLeaderboard();
      });
    }
  }

  function renderAccount(): void {
    const mount = root.querySelector("#account-mount");
    if (!mount) return;
    if (sessionEmail) {
      mount.innerHTML = `<p class="muted">Signed in as <strong>${escapeAttr(sessionEmail)}</strong></p>
        <button type="button" class="btn btn-secondary" data-action="sign-out">Sign out</button>`;
      mount.querySelector("[data-action=\"sign-out\"]")?.addEventListener("click", async () => {
        const sb = await getSupabase();
        await sb.auth.signOut();
        sessionEmail = null;
        announce("Signed out.");
        render();
      });
    } else {
      mount.innerHTML = `<div class="form-stack">
          <label>Email<input type="email" name="email" autocomplete="username" /></label>
          <label>Password<input type="password" name="password" autocomplete="current-password" /></label>
          <button type="button" class="btn" data-action="sign-in">Sign in</button>
          <button type="button" class="btn btn-secondary" data-action="sign-up">Create account</button>
        </div>`;
      mount.querySelector("[data-action=\"sign-in\"]")?.addEventListener("click", async () => {
        const email = mount.querySelector<HTMLInputElement>("input[name=\"email\"]")?.value ?? "";
        const password = mount.querySelector<HTMLInputElement>("input[name=\"password\"]")?.value ?? "";
        const sb = await getSupabase();
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          announce(error.message);
          alert(error.message);
          return;
        }
        await refreshSession();
        announce("Signed in.");
        render();
      });
      mount.querySelector("[data-action=\"sign-up\"]")?.addEventListener("click", async () => {
        const email = mount.querySelector<HTMLInputElement>("input[name=\"email\"]")?.value ?? "";
        const password = mount.querySelector<HTMLInputElement>("input[name=\"password\"]")?.value ?? "";
        const sb = await getSupabase();
        const { error } = await sb.auth.signUp({ email, password });
        if (error) {
          announce(error.message);
          alert(error.message);
          return;
        }
        await refreshSession();
        announce("Check email to confirm, or sign in if already confirmed.");
        alert("If required, confirm your email, then sign in.");
        render();
      });
    }
  }

  async function onTabVisible(): Promise<void> {
    if (currentTab === "leaderboard") await mountLeaderboard();
  }

  await refreshSession();
  getSupabase().then((sb) => {
    sb.auth.onAuthStateChange(() => {
      void refreshSession().then(() => render());
    });
  });

  render();
  void loadPuzzle();
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
