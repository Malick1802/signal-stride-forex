-- Create market_structure_trends table for pre-calculated trend analysis
CREATE TABLE IF NOT EXISTS public.market_structure_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('W', '1D', '4H')),
  trend TEXT NOT NULL CHECK (trend IN ('bullish', 'bearish', 'neutral')),
  current_hh NUMERIC,
  current_hl NUMERIC,
  current_ll NUMERIC,
  current_lh NUMERIC,
  structure_points JSONB DEFAULT '[]'::jsonb,
  last_candle_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confidence NUMERIC DEFAULT 0,
  UNIQUE(symbol, timeframe)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_market_structure_trends_lookup 
ON public.market_structure_trends(symbol, timeframe, last_updated);

-- Create structure_point_history table for debugging and analysis
CREATE TABLE IF NOT EXISTS public.structure_point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('W', '1D', '4H')),
  point_type TEXT NOT NULL CHECK (point_type IN ('HH', 'HL', 'LL', 'LH')),
  price NUMERIC NOT NULL,
  candle_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  candle_index INTEGER NOT NULL,
  trend_at_formation TEXT CHECK (trend_at_formation IN ('bullish', 'bearish', 'neutral')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for historical queries
CREATE INDEX IF NOT EXISTS idx_structure_point_history_lookup 
ON public.structure_point_history(symbol, timeframe, candle_timestamp DESC);

-- Enable RLS
ALTER TABLE public.market_structure_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structure_point_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for market_structure_trends
CREATE POLICY "Authenticated users can read market structure trends"
ON public.market_structure_trends FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage market structure trends"
ON public.market_structure_trends FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for structure_point_history
CREATE POLICY "Authenticated users can read structure point history"
ON public.structure_point_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert structure point history"
ON public.structure_point_history FOR INSERT
WITH CHECK (true);