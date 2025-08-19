-- Simple backfill with direct updates
UPDATE public.trading_signals 
SET 
  current_price = (
    SELECT current_price 
    FROM public.centralized_market_state 
    WHERE symbol = trading_signals.symbol
  ),
  last_performance_update = NOW()
WHERE status = 'active' 
  AND symbol IN (SELECT symbol FROM public.centralized_market_state)
  AND current_price IS NULL;