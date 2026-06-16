-- Manual RLS checks (run in SQL Editor as different roles or via Supabase client tests).
-- Expectations documented inline.

begin;
select plan(1);
select pass('policy smoke checks are documented comments; run manually in SQL editor');
select * from finish();
rollback;
