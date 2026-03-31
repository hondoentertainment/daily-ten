-- Manual RLS checks (run in SQL Editor as different roles or via Supabase client tests).
-- Expectations documented inline.

-- 1) As service role / postgres: can read all tables (Studio default).

-- 2) As anon key via PostgREST: SELECT puzzles where published and play_date <= today → allowed.
--    SELECT game_results → should return no rows (no policy for anon).

-- 3) As authenticated user: INSERT game_results with user_id = auth.uid() → allowed (repeat unlimited times per puzzle).
--    INSERT game_results with user_id != auth.uid() → denied.

-- 4) get_leaderboard(today) as anon: returns rows only for published puzzle date (SECURITY DEFINER).

-- Example: call RPC (adjust date)
-- select * from public.get_leaderboard((current_timestamp at time zone 'utc')::date);
