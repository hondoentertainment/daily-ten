-- Daily Tens: profiles, puzzles, game_results, leaderboard RPC, triggers

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'App profile; created by on_auth_user_created trigger.';

-- ---------------------------------------------------------------------------
-- puzzles (canonical daily content)
-- ---------------------------------------------------------------------------
CREATE TABLE public.puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  play_date date NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  puzzle_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  title text,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX puzzles_play_date_idx ON public.puzzles (play_date);
CREATE INDEX puzzles_status_idx ON public.puzzles (status);

-- ---------------------------------------------------------------------------
-- game_results (one row per user per puzzle by default)
-- ---------------------------------------------------------------------------
CREATE TABLE public.game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  puzzle_id uuid NOT NULL REFERENCES public.puzzles (id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 0),
  time_ms int CHECK (time_ms IS NULL OR time_ms >= 0),
  client_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, puzzle_id)
);

CREATE INDEX game_results_puzzle_id_idx ON public.game_results (puzzle_id);
CREATE INDEX game_results_score_idx ON public.game_results (puzzle_id, score DESC);

-- ---------------------------------------------------------------------------
-- leaderboard_daily: reporting view (RLS still applies via underlying tables;
-- prefer get_leaderboard() for anonymous-safe reads)
-- ---------------------------------------------------------------------------
CREATE VIEW public.leaderboard_daily AS
SELECT
  p.play_date,
  (ROW_NUMBER() OVER (
    PARTITION BY p.play_date
    ORDER BY gr.score DESC, gr.time_ms ASC NULLS LAST
  ))::bigint AS rank,
  COALESCE(pr.display_name, 'Player') AS display_name,
  gr.score,
  gr.time_ms
FROM public.game_results gr
JOIN public.puzzles p ON p.id = gr.puzzle_id
JOIN public.profiles pr ON pr.id = gr.user_id
WHERE p.status = 'published'
  AND p.play_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date;

COMMENT ON VIEW public.leaderboard_daily IS 'Per-day ranks; use get_leaderboard(date) for public API without exposing raw game_results to anon.';

-- ---------------------------------------------------------------------------
-- Public leaderboard RPC (SECURITY DEFINER — only safe columns)
-- ---------------------------------------------------------------------------
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
  SELECT
    (ROW_NUMBER() OVER (
      ORDER BY gr.score DESC, gr.time_ms ASC NULLS LAST
    ))::bigint,
    COALESCE(pr.display_name, 'Player'),
    gr.score,
    gr.time_ms
  FROM public.game_results gr
  JOIN public.puzzles p ON p.id = gr.puzzle_id
  JOIN public.profiles pr ON pr.id = gr.user_id
  WHERE p.play_date = p_play_date
    AND p.status = 'published'
    AND p.play_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(date) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER puzzles_updated_at
  BEFORE UPDATE ON public.puzzles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NULLIF(trim(split_part(COALESCE(NEW.email, ''), '@', 1)), ''),
      'Player'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
