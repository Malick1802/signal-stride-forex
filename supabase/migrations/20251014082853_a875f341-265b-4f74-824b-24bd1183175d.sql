-- Add source column to multi_timeframe_data table for tracking data origin
ALTER TABLE public.multi_timeframe_data
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'api';