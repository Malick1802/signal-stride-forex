-- Add centralized performance columns to trading_signals table
ALTER TABLE public.trading_signals 
ADD COLUMN IF NOT EXISTS current_pips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_pnl NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_performance_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create centralized pip calculation function
CREATE OR REPLACE FUNCTION public.calculate_signal_performance(
  signal_entry_price NUMERIC,
  signal_current_price NUMERIC,
  signal_type TEXT,
  signal_symbol TEXT
) RETURNS TABLE(pips INTEGER, percentage NUMERIC, pnl NUMERIC) AS $$
DECLARE
  price_diff NUMERIC;
  pip_size NUMERIC;
  calculated_pips INTEGER;
  calculated_percentage NUMERIC;
  calculated_pnl NUMERIC;
BEGIN
  -- Get pip size for the symbol from trading_instruments
  SELECT COALESCE(ti.pip_value, 0.0001) INTO pip_size
  FROM public.trading_instruments ti 
  WHERE ti.symbol = signal_symbol;
  
  -- If no instrument found, use default pip size
  IF pip_size IS NULL THEN
    -- Default pip sizes for major pairs
    CASE 
      WHEN signal_symbol LIKE '%JPY' THEN pip_size := 0.01;
      ELSE pip_size := 0.0001;
    END CASE;
  END IF;
  
  -- Calculate price difference based on signal type
  IF signal_type = 'BUY' THEN
    price_diff := signal_current_price - signal_entry_price;
  ELSE -- SELL
    price_diff := signal_entry_price - signal_current_price;
  END IF;
  
  -- Calculate pips
  calculated_pips := ROUND(price_diff / pip_size)::INTEGER;
  
  -- Calculate percentage
  calculated_percentage := CASE 
    WHEN signal_entry_price > 0 THEN (price_diff / signal_entry_price) * 100
    ELSE 0
  END;
  
  -- Calculate P&L (basic calculation, can be enhanced with lot size)
  calculated_pnl := price_diff;
  
  RETURN QUERY SELECT calculated_pips, calculated_percentage, calculated_pnl;
END;
$$ LANGUAGE plpgsql;

-- Create function to update signal performance from market data
CREATE OR REPLACE FUNCTION public.update_signal_performance_from_market()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update signal performance when market data changes
DROP TRIGGER IF EXISTS trigger_update_signal_performance ON public.centralized_market_state;
CREATE TRIGGER trigger_update_signal_performance
  AFTER UPDATE OF current_price ON public.centralized_market_state
  FOR EACH ROW
  WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
  EXECUTE FUNCTION public.update_signal_performance_from_market();

-- Create function to detect and create signal outcomes
CREATE OR REPLACE FUNCTION public.check_signal_outcomes()
RETURNS TRIGGER AS $$
DECLARE
  signal_record RECORD;
  outcome_exists BOOLEAN;
  hit_target BOOLEAN;
  target_level INTEGER;
  exit_price NUMERIC;
BEGIN
  -- Check all active signals for this symbol
  FOR signal_record IN 
    SELECT * FROM public.trading_signals 
    WHERE symbol = NEW.symbol AND status = 'active'
  LOOP
    -- Check if outcome already exists
    SELECT EXISTS(SELECT 1 FROM public.signal_outcomes WHERE signal_id = signal_record.id) INTO outcome_exists;
    
    IF NOT outcome_exists THEN
      hit_target := FALSE;
      target_level := NULL;
      exit_price := NULL;
      
      -- Check for stop loss hit
      IF signal_record.type = 'BUY' AND NEW.current_price <= signal_record.stop_loss THEN
        hit_target := FALSE;
        exit_price := signal_record.stop_loss;
      ELSIF signal_record.type = 'SELL' AND NEW.current_price >= signal_record.stop_loss THEN
        hit_target := FALSE;
        exit_price := signal_record.stop_loss;
      -- Check for take profit hits
      ELSIF signal_record.take_profits IS NOT NULL AND array_length(signal_record.take_profits, 1) > 0 THEN
        -- Check each take profit level
        FOR i IN 1..array_length(signal_record.take_profits, 1) LOOP
          IF signal_record.type = 'BUY' AND NEW.current_price >= signal_record.take_profits[i] THEN
            hit_target := TRUE;
            target_level := i;
            exit_price := signal_record.take_profits[i];
            EXIT; -- Exit loop on first hit
          ELSIF signal_record.type = 'SELL' AND NEW.current_price <= signal_record.take_profits[i] THEN
            hit_target := TRUE;
            target_level := i;
            exit_price := signal_record.take_profits[i];
            EXIT; -- Exit loop on first hit
          END IF;
        END LOOP;
      END IF;
      
      -- Create outcome if target or stop loss was hit
      IF exit_price IS NOT NULL THEN
        INSERT INTO public.signal_outcomes (
          signal_id,
          hit_target,
          exit_price,
          target_hit_level,
          pnl_pips,
          notes
        ) VALUES (
          signal_record.id,
          hit_target,
          exit_price,
          target_level,
          COALESCE(signal_record.current_pips, 0),
          CASE WHEN hit_target THEN 'Take profit hit' ELSE 'Stop loss hit' END
        );
        
        -- Update signal status to expired
        UPDATE public.trading_signals 
        SET status = 'expired', updated_at = NOW()
        WHERE id = signal_record.id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic outcome detection
DROP TRIGGER IF EXISTS trigger_check_signal_outcomes ON public.centralized_market_state;
CREATE TRIGGER trigger_check_signal_outcomes
  AFTER UPDATE OF current_price ON public.centralized_market_state
  FOR EACH ROW
  WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
  EXECUTE FUNCTION public.check_signal_outcomes();