-- Add AEC tracking fields to function_invocations table
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS aec_market_quality NUMERIC;
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS aec_dynamic_threshold NUMERIC;
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS aec_escalate_count INTEGER;
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS aec_guardrails_applied JSONB;

-- Add tier distribution tracking
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS tier1_distribution JSONB;
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS tier2_escalated INTEGER DEFAULT 0;
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS tier3_reached INTEGER DEFAULT 0;
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS openai_capacity_limit INTEGER DEFAULT 8;
ALTER TABLE function_invocations ADD COLUMN IF NOT EXISTS concurrency_failures INTEGER DEFAULT 0;