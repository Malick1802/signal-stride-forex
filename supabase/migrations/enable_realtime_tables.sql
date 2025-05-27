
-- Enable replica identity for real-time updates
ALTER TABLE public.centralized_market_state REPLICA IDENTITY FULL;
ALTER TABLE public.live_price_history REPLICA IDENTITY FULL;
ALTER TABLE public.trading_signals REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.centralized_market_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_price_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;
