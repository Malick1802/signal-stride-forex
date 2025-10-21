-- Phase 1: Function to clear stale candle data
CREATE OR REPLACE FUNCTION public.cleanup_stale_candle_data(hours_old INTEGER DEFAULT 1)
RETURNS TABLE(deleted_count BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_rows BIGINT;
BEGIN
  DELETE FROM public.multi_timeframe_data 
  WHERE timestamp < NOW() - (hours_old || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  
  RETURN QUERY SELECT deleted_rows;
END;
$$;

-- Phase 5: Signal health monitoring view
CREATE OR REPLACE VIEW public.signal_health_metrics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as signals_created,
  COUNT(*) FILTER (WHERE status = 'expired' AND updated_at < created_at + INTERVAL '5 minutes') as immediate_expiries,
  ROUND(AVG(CASE 
    WHEN type = 'BUY' AND take_profits[1] > price THEN 1
    WHEN type = 'SELL' AND take_profits[1] < price THEN 1
    ELSE 0
  END) * 100, 1) as valid_tp_ratio_pct,
  ROUND(AVG(ABS(price - stop_loss) / NULLIF(price, 0)) * 100, 2) as avg_stop_distance_pct,
  STRING_AGG(DISTINCT strategy_type, ', ' ORDER BY strategy_type) as strategies_used
FROM public.trading_signals
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND is_centralized = true
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;