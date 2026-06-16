-- pgTAP tests: run with `supabase test db` (requires local Supabase / Docker).
-- Validates core tables, RPC, and a representative RLS policy.

begin;
select plan(8);

select has_table('public', 'profiles');
select has_table('public', 'puzzles');
select has_table('public', 'game_results');
select has_table('public', 'rate_limit_events');

select has_column('public', 'puzzles', 'puzzle_payload');
select has_column('public', 'game_results', 'score');

select has_function('public', 'get_leaderboard', array['date']);

select ok(
  exists(
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'puzzles'
      and policyname = 'puzzles_select_published'
  ),
  'puzzles_select_published policy exists'
);

select * from finish();
rollback;
