-- Add strategy-specific columns to trading_signals
ALTER TABLE trading_signals 
ADD COLUMN IF NOT EXISTS timeframe_confluence jsonb,
ADD COLUMN IF NOT EXISTS entry_timeframe text,
ADD COLUMN IF NOT EXISTS aoi_zones jsonb,
ADD COLUMN IF NOT EXISTS pattern_detected text,
ADD COLUMN IF NOT EXISTS pattern_confidence numeric,
ADD COLUMN IF NOT EXISTS structure_points jsonb,
ADD COLUMN IF NOT EXISTS strategy_type text;

-- Add check constraint for strategy_type
ALTER TABLE trading_signals 
ADD CONSTRAINT check_strategy_type 
CHECK (strategy_type IN ('trend_continuation', 'head_and_shoulders_reversal', 'confluence_reversal'));

-- Add index for filtering by strategy
CREATE INDEX IF NOT EXISTS idx_trading_signals_strategy 
ON trading_signals(strategy_type, status, confidence DESC);

-- Add entry_threshold to app_settings
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS entry_threshold text DEFAULT 'LOW';

-- Add comments for documentation
COMMENT ON COLUMN trading_signals.timeframe_confluence IS 'Multi-timeframe trend alignment (W+D+4H)';
COMMENT ON COLUMN trading_signals.entry_timeframe IS 'Execution timeframe (4H or 1H)';
COMMENT ON COLUMN trading_signals.aoi_zones IS 'Areas of Interest (support/resistance zones)';
COMMENT ON COLUMN trading_signals.pattern_detected IS 'Chart pattern if detected (e.g., H&S)';
COMMENT ON COLUMN trading_signals.pattern_confidence IS 'Confidence in detected pattern';
COMMENT ON COLUMN trading_signals.structure_points IS 'Market structure highs/lows';
COMMENT ON COLUMN trading_signals.strategy_type IS 'Strategy used: trend_continuation, head_and_shoulders_reversal, or confluence_reversal';
COMMENT ON COLUMN app_settings.entry_threshold IS 'Entry threshold: LOW (break only) or HIGH (retest required)';