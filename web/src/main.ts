import { createClient } from "@supabase/supabase-js";
import "./style.css";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const app = document.querySelector<HTMLDivElement>("#app")!;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function boot(): Promise<void> {
  const configured = Boolean(url && anon);

  if (!configured) {
    app.innerHTML = `
    <main class="wrap">
      <h1>Daily Tens</h1>
      <p class="lede">Web shell is deployed. Add environment variables in Vercel to connect Supabase.</p>
      <ul class="check">
        <li><code>VITE_SUPABASE_URL</code></li>
        <li><code>VITE_SUPABASE_ANON_KEY</code></li>
      </ul>
      <p class="muted">Redeploy after saving env vars. See <code>docs/DEPLOY.md</code>.</p>
    </main>
  `;
    return;
  }

  const supabase = createClient(url!, anon!);
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_play_date: new Date().toISOString().slice(0, 10),
  });

  app.innerHTML = `
    <main class="wrap">
      <h1>Daily Tens</h1>
      <p class="lede">One puzzle a day. Backend is live on Supabase.</p>
      <section class="panel">
        <h2>Today’s leaderboard sample</h2>
        ${
          error
            ? `<p class="muted">Could not load leaderboard: ${escapeHtml(error.message)}</p>`
            : !data?.length
              ? "<p class=\"muted\">No scores yet for today (or no published puzzle).</p>"
              : `<ol class="board">${(data as { rank: number; display_name: string; score: number }[])
                  .slice(0, 10)
                  .map(
                    (r) =>
                      `<li><span class="name">${escapeHtml(r.display_name)}</span> <span class="score">${r.score}</span></li>`,
                  )
                  .join("")}</ol>`
        }
      </section>
      <p class="foot">PRD: <code>docs/PRD.md</code></p>
    </main>
  `;
}

void boot();
