-- Create a lightweight cache table for AI analysis skipping/fairness
-- Stores the last analysis fingerprint per symbol to avoid redundant OpenAI calls

CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
  symbol text PRIMARY KEY,
  last_hash text,
  last_analyzed_at timestamptz NOT NULL DEFAULT now(),
  last_decision text,
  last_confidence numeric
);

-- Enable RLS (edge functions use service role and are unaffected). No public policies defined.
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Index to quickly find stale entries for fairness rotation
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_last_analyzed_at
ON public.ai_analysis_cache (last_analyzed_at DESC);
