-- Explicit API grants for PostgREST (anon / authenticated).

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE public.puzzles TO anon, authenticated;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT SELECT, INSERT ON TABLE public.game_results TO authenticated;
