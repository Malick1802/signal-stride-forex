
-- Add comprehensive market data table for OHLCV storage
CREATE TABLE IF NOT EXISTS public.comprehensive_market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume NUMERIC DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add economic events table
CREATE TABLE IF NOT EXISTS public.economic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  currency TEXT NOT NULL,
  impact_level TEXT NOT NULL CHECK (impact_level IN ('High', 'Medium', 'Low')),
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_value TEXT,
  forecast_value TEXT,
  previous_value TEXT,
  sentiment_score NUMERIC DEFAULT 0 CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add technical indicators table
CREATE TABLE IF NOT EXISTS public.technical_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1h',
  rsi_14 NUMERIC,
  macd_line NUMERIC,
  macd_signal NUMERIC,
  macd_histogram NUMERIC,
  bb_upper NUMERIC,
  bb_middle NUMERIC,
  bb_lower NUMERIC,
  ema_50 NUMERIC,
  ema_200 NUMERIC,
  atr_14 NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add chart patterns table
CREATE TABLE IF NOT EXISTS public.chart_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  support_level NUMERIC,
  resistance_level NUMERIC,
  target_price NUMERIC,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add market sentiment table
CREATE TABLE IF NOT EXISTS public.market_sentiment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  sentiment_score NUMERIC NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('Positive', 'Neutral', 'Negative')),
  retail_long_percentage NUMERIC,
  retail_short_percentage NUMERIC,
  institutional_bias TEXT,
  news_sentiment NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comprehensive_market_data_symbol_timestamp ON public.comprehensive_market_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_economic_events_currency_time ON public.economic_events(currency, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol_timestamp ON public.technical_indicators(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chart_patterns_symbol_detected ON public.chart_patterns(symbol, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_symbol_timestamp ON public.market_sentiment(symbol, timestamp DESC);

-- Update trading_signals table to include new analysis fields
ALTER TABLE public.trading_signals 
ADD COLUMN IF NOT EXISTS technical_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fundamental_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pattern_detected TEXT,
ADD COLUMN IF NOT EXISTS economic_impact TEXT,
ADD COLUMN IF NOT EXISTS risk_reward_ratio NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS technical_indicators JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS market_context JSONB DEFAULT '{}';
