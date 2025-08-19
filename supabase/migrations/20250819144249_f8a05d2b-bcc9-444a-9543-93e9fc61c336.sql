-- Add comprehensive audit and validation fields to trading_signals table
ALTER TABLE public.trading_signals 
ADD COLUMN IF NOT EXISTS t1_score numeric,
ADD COLUMN IF NOT EXISTS t1_confirmations text[],
ADD COLUMN IF NOT EXISTS t2_quality numeric,
ADD COLUMN IF NOT EXISTS t2_confidence numeric,
ADD COLUMN IF NOT EXISTS t3_quality numeric,
ADD COLUMN IF NOT EXISTS t3_confidence numeric,
ADD COLUMN IF NOT EXISTS indicator_checklist jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS gates_passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gate_fail_reasons text[],
ADD COLUMN IF NOT EXISTS final_quality numeric,
ADD COLUMN IF NOT EXISTS final_confidence numeric,
ADD COLUMN IF NOT EXISTS allow_tier2_publish boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.trading_signals.t1_score IS 'Tier 1 technical analysis score (0-100)';
COMMENT ON COLUMN public.trading_signals.t1_confirmations IS 'Array of Tier 1 confirmation factors';
COMMENT ON COLUMN public.trading_signals.t2_quality IS 'Tier 2 AI analysis quality score';
COMMENT ON COLUMN public.trading_signals.t2_confidence IS 'Tier 2 AI analysis confidence level';
COMMENT ON COLUMN public.trading_signals.t3_quality IS 'Tier 3 premium AI analysis quality score';
COMMENT ON COLUMN public.trading_signals.t3_confidence IS 'Tier 3 premium AI analysis confidence level';
COMMENT ON COLUMN public.trading_signals.indicator_checklist IS 'JSON object with indicator validation results (macd_ok, atr_ok, rsi_divergence_or_trend, timeframe_alignment_ok, etc.)';
COMMENT ON COLUMN public.trading_signals.gates_passed IS 'Whether all publish gates have been passed';
COMMENT ON COLUMN public.trading_signals.gate_fail_reasons IS 'Array of reasons why gates failed';
COMMENT ON COLUMN public.trading_signals.final_quality IS 'Final comprehensive quality score (Tier 3 verified)';
COMMENT ON COLUMN public.trading_signals.final_confidence IS 'Final comprehensive confidence score (Tier 3 verified)';
COMMENT ON COLUMN public.trading_signals.allow_tier2_publish IS 'Safety switch to allow Tier 2 publishing (default: false)';

-- Create index for better query performance on gates_passed
CREATE INDEX IF NOT EXISTS idx_trading_signals_gates_passed ON public.trading_signals(gates_passed);
CREATE INDEX IF NOT EXISTS idx_trading_signals_final_quality ON public.trading_signals(final_quality);
CREATE INDEX IF NOT EXISTS idx_trading_signals_tier_level ON public.trading_signals(tier_level);