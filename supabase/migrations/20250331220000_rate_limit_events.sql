-- Rate limiting for Edge Functions (service role only; no anon policies).

CREATE TABLE public.rate_limit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_events_bucket_created_idx
  ON public.rate_limit_events (bucket, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rate_limit_events IS 'Write-only from Edge Functions (service role) for submit-result throttling.';
