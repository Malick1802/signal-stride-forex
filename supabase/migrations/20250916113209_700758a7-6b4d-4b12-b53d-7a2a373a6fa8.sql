-- Fix database replica identity for real-time updates
ALTER TABLE public.trading_signals REPLICA IDENTITY FULL;

-- Ensure the table is added to realtime publication (if not already)
-- This ensures complete row data is sent in real-time events