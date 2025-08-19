-- Harden function by setting search_path explicitly
CREATE OR REPLACE FUNCTION public.check_signal_outcomes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  signal_record RECORD;
  outcome_exists BOOLEAN;
  stop_loss_hit BOOLEAN;
  all_tps_hit BOOLEAN;
  exit_price NUMERIC;
  expire_reason TEXT;
BEGIN
  -- Check all active signals for this symbol
  FOR signal_record IN 
    SELECT * FROM public.trading_signals 
    WHERE symbol = NEW.symbol AND status = 'active'
  LOOP
    -- Check if outcome already exists
    SELECT EXISTS(SELECT 1 FROM public.signal_outcomes WHERE signal_id = signal_record.id) INTO outcome_exists;
    
    IF NOT outcome_exists THEN
      stop_loss_hit := FALSE;
      all_tps_hit := FALSE;
      exit_price := NULL;
      expire_reason := NULL;
      
      -- Check for stop loss hit
      IF signal_record.type = 'BUY' AND NEW.current_price <= signal_record.stop_loss THEN
        stop_loss_hit := TRUE;
        exit_price := signal_record.stop_loss;
        expire_reason := 'stop_loss_hit';
      ELSIF signal_record.type = 'SELL' AND NEW.current_price >= signal_record.stop_loss THEN
        stop_loss_hit := TRUE;
        exit_price := signal_record.stop_loss;
        expire_reason := 'stop_loss_hit';
      END IF;
      
      -- Only check for ALL take profits hit if stop loss not hit
      IF NOT stop_loss_hit AND signal_record.take_profits IS NOT NULL AND array_length(signal_record.take_profits, 1) > 0 THEN
        all_tps_hit := TRUE;
        
        -- Check that ALL take profit levels have been hit
        FOR i IN 1..array_length(signal_record.take_profits, 1) LOOP
          IF signal_record.type = 'BUY' THEN
            IF NEW.current_price < signal_record.take_profits[i] THEN
              all_tps_hit := FALSE;
              EXIT;
            END IF;
          ELSIF signal_record.type = 'SELL' THEN
            IF NEW.current_price > signal_record.take_profits[i] THEN
              all_tps_hit := FALSE;
              EXIT;
            END IF;
          END IF;
        END LOOP;
        
        -- If all TPs hit, use the highest TP as exit price
        IF all_tps_hit THEN
          exit_price := signal_record.take_profits[array_length(signal_record.take_profits, 1)];
          expire_reason := 'all_take_profits_hit';
        END IF;
      END IF;
      
      -- Create outcome and expire signal ONLY if stop loss hit OR all TPs hit
      IF stop_loss_hit OR all_tps_hit THEN
        -- Create the outcome record
        INSERT INTO public.signal_outcomes (
          signal_id,
          hit_target,
          exit_price,
          target_hit_level,
          pnl_pips,
          notes,
          processed_by
        ) VALUES (
          signal_record.id,
          all_tps_hit, -- TRUE if all TPs hit, FALSE if stop loss
          exit_price,
          CASE WHEN all_tps_hit THEN array_length(signal_record.take_profits, 1) ELSE NULL END,
          COALESCE(signal_record.current_pips, 0),
          CASE 
            WHEN all_tps_hit THEN 'All take profits hit'
            WHEN stop_loss_hit THEN 'Stop loss hit'
            ELSE 'Signal expired'
          END,
          'database_trigger'
        );
        
        -- Update signal status to expired with audit info
        UPDATE public.trading_signals 
        SET 
          status = 'expired',
          updated_at = NOW(),
          expire_reason = expire_reason,
          expired_by = 'database_trigger',
          last_expiration_check = NOW()
        WHERE id = signal_record.id;
        
        -- Log the expiration for debugging
        RAISE NOTICE 'Signal % expired: reason=%, exit_price=%', signal_record.id, expire_reason, exit_price;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger remains intact
DROP TRIGGER IF EXISTS check_signal_outcomes_trigger ON public.centralized_market_state;
CREATE TRIGGER check_signal_outcomes_trigger
  AFTER INSERT OR UPDATE ON public.centralized_market_state
  FOR EACH ROW EXECUTE FUNCTION public.check_signal_outcomes();