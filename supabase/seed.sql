-- Seed dev data (runs after migrations). Safe to re-run: idempotent for puzzle row.

INSERT INTO public.puzzles (play_date, status, puzzle_payload, title)
VALUES (
  (CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date,
  'published',
  jsonb_build_object(
    'type', 'daily_tens',
    'prompt', 'Sample daily puzzle',
    'answers', jsonb_build_array('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN')
  ),
  'Development seed'
)
ON CONFLICT (play_date) DO UPDATE SET
  puzzle_payload = EXCLUDED.puzzle_payload,
  title = EXCLUDED.title,
  status = EXCLUDED.status;
