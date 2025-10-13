-- Add AI validation tracking columns to trading_signals
ALTER TABLE trading_signals 
ADD COLUMN IF NOT EXISTS ai_validated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_confidence numeric,
ADD COLUMN IF NOT EXISTS structure_confidence numeric;

-- Add index for filtering AI-validated signals
CREATE INDEX IF NOT EXISTS idx_trading_signals_ai_validated 
ON trading_signals(ai_validated, confidence DESC);

-- Add AI validation enabled setting to app_settings
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS ai_validation_enabled text DEFAULT 'true';

COMMENT ON COLUMN trading_signals.ai_validated IS 'Whether signal was validated by AI (Tier 2)';
COMMENT ON COLUMN trading_signals.ai_confidence IS 'Confidence score from AI validation (70-95)';
COMMENT ON COLUMN trading_signals.structure_confidence IS 'Original confidence from structure-based analysis';
COMMENT ON COLUMN app_settings.ai_validation_enabled IS 'Enable/disable AI validation layer (true/false)';
