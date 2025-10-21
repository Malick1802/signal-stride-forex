-- Make pips column nullable to support both pip-based and pattern-based signals
-- H&S signals use take_profits arrays instead of pips
ALTER TABLE trading_signals 
ALTER COLUMN pips DROP NOT NULL;

-- Add comment explaining the nullable constraint
COMMENT ON COLUMN trading_signals.pips IS 'Nullable to support both pip-based signals (trend continuation) and pattern-based signals (H&S with take_profits arrays)';