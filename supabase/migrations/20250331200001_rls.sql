-- Row Level Security: puzzles (public read published), profiles (self), game_results (self)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- profiles: read/update own row only
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- puzzles: anonymous + authenticated can read published puzzles up to today (UTC date)
CREATE POLICY "puzzles_select_published"
  ON public.puzzles FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND play_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date
  );

-- game_results: insert only as self
CREATE POLICY "game_results_insert_own"
  ON public.game_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- game_results: read own submissions
CREATE POLICY "game_results_select_own"
  ON public.game_results FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- No direct INSERT/UPDATE/DELETE on puzzles or profiles from clients (admins use service role / Studio)

COMMENT ON POLICY "puzzles_select_published" ON public.puzzles IS 'Public read for shipped daily content; writes go through Edge Functions with service role.';

-- leaderboard_daily: direct SELECT would respect RLS on game_results and show incomplete data.
-- Use get_leaderboard(date) for rankings. Revoke Data API access to the view.
REVOKE ALL ON public.leaderboard_daily FROM PUBLIC;
