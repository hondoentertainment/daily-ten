-- Allow unlimited plays: many rows per (user_id, puzzle_id).
-- Leaderboard uses each user's best score for that calendar day.

ALTER TABLE public.game_results DROP CONSTRAINT IF EXISTS game_results_user_id_puzzle_id_key;

CREATE INDEX IF NOT EXISTS game_results_user_puzzle_created_idx
  ON public.game_results (user_id, puzzle_id, created_at DESC);

COMMENT ON TABLE public.game_results IS 'One row per play attempt; leaderboard RPC dedupes to best score per user per day.';

DROP VIEW IF EXISTS public.leaderboard_daily;

CREATE VIEW public.leaderboard_daily AS
WITH best_per_user AS (
  SELECT DISTINCT ON (gr.user_id, p.play_date)
    p.play_date,
    gr.user_id,
    gr.score,
    gr.time_ms
  FROM public.game_results gr
  JOIN public.puzzles p ON p.id = gr.puzzle_id
  WHERE p.status = 'published'
    AND p.play_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date
  ORDER BY gr.user_id, p.play_date, gr.score DESC, gr.time_ms ASC NULLS LAST
)
SELECT
  b.play_date,
  (ROW_NUMBER() OVER (
    PARTITION BY b.play_date
    ORDER BY b.score DESC, b.time_ms ASC NULLS LAST
  ))::bigint AS rank,
  COALESCE(pr.display_name, 'Player') AS display_name,
  b.score,
  b.time_ms
FROM best_per_user b
JOIN public.profiles pr ON pr.id = b.user_id;

COMMENT ON VIEW public.leaderboard_daily IS 'Per-day ranks using each user''s best score that day; raw attempts live in game_results.';

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_play_date date)
RETURNS TABLE (
  rank bigint,
  display_name text,
  score int,
  time_ms int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH best_per_user AS (
    SELECT DISTINCT ON (gr.user_id)
      gr.user_id,
      gr.score,
      gr.time_ms
    FROM public.game_results gr
    JOIN public.puzzles p ON p.id = gr.puzzle_id
    WHERE p.play_date = p_play_date
      AND p.status = 'published'
      AND p.play_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date
    ORDER BY gr.user_id, gr.score DESC, gr.time_ms ASC NULLS LAST
  )
  SELECT
    (ROW_NUMBER() OVER (
      ORDER BY b.score DESC, b.time_ms ASC NULLS LAST
    ))::bigint,
    COALESCE(pr.display_name, 'Player'),
    b.score,
    b.time_ms
  FROM best_per_user b
  JOIN public.profiles pr ON pr.id = b.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(date) TO anon, authenticated;

REVOKE ALL ON public.leaderboard_daily FROM PUBLIC;
