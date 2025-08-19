-- Backfill existing active signals with current performance data

-- Update active signals with current market prices and performance metrics
UPDATE public.trading_signals ts
SET 
  current_price = cms.current_price,
  current_pips = perf.pips,
  current_percentage = perf.percentage,
  current_pnl = perf.pnl,
  last_performance_update = NOW()
FROM public.centralized_market_state cms,
     public.calculate_signal_performance(ts.price, cms.current_price, ts.type, ts.symbol) perf
WHERE ts.symbol = cms.symbol
  AND ts.status = 'active'
  AND ts.price IS NOT NULL
  AND cms.current_price IS NOT NULL
  AND (ts.current_price IS NULL OR ts.current_price != cms.current_price);

-- Add publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.centralized_market_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;