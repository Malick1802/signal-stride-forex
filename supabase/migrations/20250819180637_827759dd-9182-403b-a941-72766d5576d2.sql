-- Fix missing database triggers and functions for signal performance updates

-- First, ensure the trigger function exists and works correctly
CREATE OR REPLACE FUNCTION public.update_signal_performance_from_market()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  signal_rec RECORD;
  perf_data RECORD;
BEGIN
  -- Update all active signals for this symbol with new performance data
  FOR signal_rec IN 
    SELECT id, price, type, symbol 
    FROM public.trading_signals 
    WHERE symbol = NEW.symbol 
      AND status = 'active' 
      AND price IS NOT NULL
  LOOP
    -- Calculate performance for this signal
    SELECT * INTO perf_data 
    FROM public.calculate_signal_performance(
      signal_rec.price, 
      NEW.current_price, 
      signal_rec.type, 
      signal_rec.symbol
    );
    
    -- Update the signal with calculated performance
    UPDATE public.trading_signals 
    SET 
      current_price = NEW.current_price,
      current_pips = perf_data.pips,
      current_percentage = perf_data.percentage,
      current_pnl = perf_data.pnl,
      last_performance_update = NOW()
    WHERE id = signal_rec.id;
  END LOOP;
    
  RETURN NEW;
END;
$function$;

-- Create trigger on centralized_market_state for real-time signal performance updates
DROP TRIGGER IF EXISTS trigger_update_signal_performance ON public.centralized_market_state;
CREATE TRIGGER trigger_update_signal_performance
  AFTER UPDATE ON public.centralized_market_state
  FOR EACH ROW
  WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
  EXECUTE FUNCTION public.update_signal_performance_from_market();

-- Create trigger on market_data for backup performance updates
DROP TRIGGER IF EXISTS trigger_update_signal_performance_market_data ON public.market_data;  
CREATE TRIGGER trigger_update_signal_performance_market_data
  AFTER INSERT OR UPDATE ON public.market_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_signal_performance_from_market();

-- Enable realtime for centralized_market_state table
ALTER TABLE public.centralized_market_state REPLICA IDENTITY FULL;