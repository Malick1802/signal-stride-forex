-- Enable replica identity and add tables to realtime publication for proper real-time updates

-- Set replica identity to full for all realtime tables to ensure complete row data is sent
ALTER TABLE public.trading_signals REPLICA IDENTITY FULL;
ALTER TABLE public.signal_outcomes REPLICA IDENTITY FULL;
ALTER TABLE public.centralized_market_state REPLICA IDENTITY FULL;
ALTER TABLE public.live_price_history REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication so clients can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_outcomes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.centralized_market_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_price_history;