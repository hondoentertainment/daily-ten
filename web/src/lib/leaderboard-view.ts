import { escapeHtml } from "./html";

export type LeaderboardRow = {
  rank: number;
  display_name: string;
  score: number;
};

/** Inner HTML for the leaderboard panel (injected into the page). */
export function leaderboardSectionInnerHtml(
  error: { message: string } | null,
  data: LeaderboardRow[] | null | undefined,
): string {
  if (error) {
    return `<p class="muted">Could not load leaderboard: ${escapeHtml(error.message)}</p>`;
  }
  if (!data?.length) {
    return '<p class="muted">No scores yet for today (or no published puzzle).</p>';
  }
  const items = data
    .slice(0, 10)
    .map(
      (r) =>
        `<li><span class="name">${escapeHtml(r.display_name)}</span> <span class="score">${r.score}</span></li>`,
    )
    .join("");
  return `<ol class="board">${items}</ol>`;
}
