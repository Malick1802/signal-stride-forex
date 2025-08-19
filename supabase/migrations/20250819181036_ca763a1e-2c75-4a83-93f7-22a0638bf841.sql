-- Backfill existing active signals with current performance data

-- Update active signals with current market prices and performance metrics
DO $$
DECLARE
  signal_record RECORD;
  perf_data RECORD;
BEGIN
  FOR signal_record IN 
    SELECT ts.id, ts.symbol, ts.price, ts.type 
    FROM public.trading_signals ts
    INNER JOIN public.centralized_market_state cms ON ts.symbol = cms.symbol
    WHERE ts.status = 'active' 
      AND ts.price IS NOT NULL
      AND cms.current_price IS NOT NULL
      AND (ts.current_price IS NULL OR ts.current_price != cms.current_price)
  LOOP
    -- Get current market price for this symbol
    SELECT cms.current_price INTO perf_data
    FROM public.centralized_market_state cms 
    WHERE cms.symbol = signal_record.symbol;
    
    -- Calculate performance and update the signal
    IF perf_data.current_price IS NOT NULL THEN
      UPDATE public.trading_signals 
      SET 
        current_price = perf_data.current_price,
        current_pips = (
          SELECT pips FROM public.calculate_signal_performance(
            signal_record.price, 
            perf_data.current_price, 
            signal_record.type, 
            signal_record.symbol
          )
        ),
        current_percentage = (
          SELECT percentage FROM public.calculate_signal_performance(
            signal_record.price, 
            perf_data.current_price, 
            signal_record.type, 
            signal_record.symbol
          )
        ),
        current_pnl = (
          SELECT pnl FROM public.calculate_signal_performance(
            signal_record.price, 
            perf_data.current_price, 
            signal_record.type, 
            signal_record.symbol
          )
        ),
        last_performance_update = NOW()
      WHERE id = signal_record.id;
    END IF;
  END LOOP;
END $$;

-- Add publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.centralized_market_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;