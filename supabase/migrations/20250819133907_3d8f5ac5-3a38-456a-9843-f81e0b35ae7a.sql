-- Enhanced 3-Tier Forex Signal Generation Database Migration
-- This migration implements professional-grade forex analysis infrastructure

-- Create multi-timeframe OHLCV data table for comprehensive technical analysis
CREATE TABLE IF NOT EXISTS public.multi_timeframe_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL, -- '1M', '5M', '15M', '1H', '4H', 'D'
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume NUMERIC DEFAULT 0,
  atr NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, timeframe, timestamp)
);

-- Index for fast querying by symbol and timeframe
CREATE INDEX IF NOT EXISTS idx_multi_timeframe_symbol_timeframe_timestamp 
ON public.multi_timeframe_data(symbol, timeframe, timestamp DESC);

-- Create professional technical indicators table
CREATE TABLE IF NOT EXISTS public.enhanced_technical_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- RSI indicators
  rsi_14 NUMERIC,
  rsi_oversold_strength TEXT, -- 'weak', 'moderate', 'strong', 'extreme'
  rsi_overbought_strength TEXT,
  rsi_bullish_divergence BOOLEAN DEFAULT FALSE,
  rsi_bearish_divergence BOOLEAN DEFAULT FALSE,
  
  -- MACD indicators  
  macd_line NUMERIC,
  macd_signal NUMERIC,
  macd_histogram NUMERIC,
  macd_strength NUMERIC,
  macd_bullish_divergence BOOLEAN DEFAULT FALSE,
  macd_bearish_divergence BOOLEAN DEFAULT FALSE,
  
  -- Bollinger Bands
  bb_upper NUMERIC,
  bb_middle NUMERIC,
  bb_lower NUMERIC,
  bb_position TEXT, -- 'above', 'below', 'within'
  bb_squeeze BOOLEAN DEFAULT FALSE,
  bb_bandwidth NUMERIC,
  
  -- Moving averages
  ema_20 NUMERIC,
  ema_50 NUMERIC,
  ema_200 NUMERIC,
  sma_20 NUMERIC,
  sma_50 NUMERIC,
  sma_200 NUMERIC,
  
  -- Momentum indicators
  stochastic NUMERIC,
  williams_r NUMERIC,
  roc_12 NUMERIC, -- Rate of Change
  
  -- Volatility indicators
  atr_14 NUMERIC,
  volatility_profile TEXT, -- 'low', 'normal', 'high', 'extreme'
  
  -- Support/Resistance levels
  support_levels NUMERIC[],
  resistance_levels NUMERIC[],
  
  -- Pattern detection
  candlestick_pattern TEXT,
  chart_pattern TEXT,
  pattern_confidence NUMERIC,
  
  -- Fibonacci levels
  fibonacci_retracements JSONB,
  fibonacci_extensions JSONB,
  
  -- Pivot points
  pivot_point NUMERIC,
  support_1 NUMERIC,
  support_2 NUMERIC,
  support_3 NUMERIC,
  resistance_1 NUMERIC,
  resistance_2 NUMERIC,
  resistance_3 NUMERIC,
  
  -- Market regime
  market_regime TEXT, -- 'trending', 'ranging', 'volatile'
  trend_direction TEXT, -- 'bullish', 'bearish', 'neutral'
  trend_strength NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, timeframe, timestamp)
);

-- Index for fast technical indicator queries
CREATE INDEX IF NOT EXISTS idx_enhanced_technical_symbol_timeframe_timestamp
ON public.enhanced_technical_indicators(symbol, timeframe, timestamp DESC);

-- Create professional risk management table
CREATE TABLE IF NOT EXISTS public.professional_risk_management (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.trading_signals(id) ON DELETE CASCADE,
  
  -- Position sizing
  recommended_lot_size NUMERIC NOT NULL,
  maximum_lot_size NUMERIC NOT NULL,
  account_risk_percentage NUMERIC NOT NULL DEFAULT 2.0,
  position_value NUMERIC,
  
  -- Risk calculations
  stop_loss_pips INTEGER NOT NULL,
  take_profit_pips INTEGER[],
  risk_reward_ratio NUMERIC NOT NULL,
  maximum_drawdown_allowed NUMERIC,
  
  -- Dynamic stop loss
  atr_multiplier NUMERIC NOT NULL DEFAULT 2.5,
  minimum_stop_distance NUMERIC NOT NULL,
  dynamic_stop_price NUMERIC,
  trailing_stop_enabled BOOLEAN DEFAULT FALSE,
  
  -- Correlation management
  correlated_pairs TEXT[],
  correlation_conflict BOOLEAN DEFAULT FALSE,
  max_correlated_positions INTEGER DEFAULT 2,
  
  -- Session analysis
  trading_session TEXT, -- 'Asian', 'European', 'American', 'Overlap'
  session_volatility NUMERIC,
  optimal_entry_time BOOLEAN DEFAULT FALSE,
  
  -- Market conditions
  market_volatility TEXT, -- 'low', 'normal', 'high', 'extreme'
  economic_events_nearby BOOLEAN DEFAULT FALSE,
  news_sentiment_score NUMERIC,
  
  -- Performance tracking
  expected_pnl_pips INTEGER,
  confidence_adjusted_size NUMERIC,
  quality_score INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create comprehensive signal validation table
CREATE TABLE IF NOT EXISTS public.signal_validation_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.trading_signals(id) ON DELETE CASCADE,
  
  -- Tier 1 validation (Free local analysis)
  tier1_score INTEGER NOT NULL DEFAULT 0,
  tier1_confirmations TEXT[],
  tier1_passed BOOLEAN DEFAULT FALSE,
  
  -- Tier 2 validation (Cost-effective AI)
  tier2_score INTEGER,
  tier2_confirmations TEXT[],
  tier2_model TEXT DEFAULT 'gpt-4o-mini',
  tier2_tokens_used INTEGER,
  tier2_cost NUMERIC,
  tier2_passed BOOLEAN DEFAULT FALSE,
  
  -- Tier 3 validation (Premium AI)
  tier3_score INTEGER,
  tier3_confirmations TEXT[],
  tier3_model TEXT DEFAULT 'gpt-4.1-2025-04-14',
  tier3_tokens_used INTEGER,
  tier3_cost NUMERIC,
  tier3_reasoning TEXT,
  tier3_passed BOOLEAN DEFAULT FALSE,
  
  -- Technical validations
  technical_score INTEGER NOT NULL DEFAULT 0,
  fundamental_score INTEGER DEFAULT 0,
  sentiment_score INTEGER DEFAULT 0,
  
  -- Multi-timeframe alignment
  timeframe_1m_aligned BOOLEAN DEFAULT FALSE,
  timeframe_5m_aligned BOOLEAN DEFAULT FALSE,
  timeframe_15m_aligned BOOLEAN DEFAULT FALSE,
  timeframe_1h_aligned BOOLEAN DEFAULT TRUE, -- Primary timeframe
  timeframe_4h_aligned BOOLEAN DEFAULT FALSE,
  timeframe_daily_aligned BOOLEAN DEFAULT FALSE,
  
  -- Signal quality assessment
  overall_quality_grade TEXT NOT NULL, -- 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'
  minimum_requirements_met BOOLEAN DEFAULT FALSE,
  professional_grade BOOLEAN DEFAULT FALSE,
  
  -- Performance predictions
  predicted_success_rate NUMERIC,
  historical_pattern_match NUMERIC,
  backtest_performance JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create correlation matrix table for pair relationships
CREATE TABLE IF NOT EXISTS public.currency_correlation_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_1 TEXT NOT NULL,
  pair_2 TEXT NOT NULL,
  correlation_coefficient NUMERIC NOT NULL, -- -1 to 1
  timeframe TEXT NOT NULL DEFAULT '1H',
  calculation_period INTEGER DEFAULT 100, -- Number of periods used
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(pair_1, pair_2, timeframe),
  CHECK (correlation_coefficient >= -1 AND correlation_coefficient <= 1)
);

-- Pre-populate correlation matrix with known major pair relationships
INSERT INTO public.currency_correlation_matrix (pair_1, pair_2, correlation_coefficient, timeframe) VALUES
('EURUSD', 'GBPUSD', 0.75, '1H'),
('EURUSD', 'USDCHF', -0.85, '1H'),
('GBPUSD', 'USDCHF', -0.65, '1H'),
('EURUSD', 'AUDUSD', 0.60, '1H'),
('GBPUSD', 'AUDUSD', 0.55, '1H'),
('USDCAD', 'AUDUSD', -0.50, '1H'),
('USDJPY', 'EURJPY', 0.80, '1H'),
('USDJPY', 'GBPJPY', 0.75, '1H'),
('EURJPY', 'GBPJPY', 0.85, '1H')
ON CONFLICT (pair_1, pair_2, timeframe) DO NOTHING;

-- Create economic events impact table
CREATE TABLE IF NOT EXISTS public.economic_events_impact (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  impact_level TEXT NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  actual_value TEXT,
  forecast_value TEXT,
  previous_value TEXT,
  
  -- Market impact assessment
  affected_pairs TEXT[],
  volatility_increase_expected NUMERIC, -- Percentage increase
  directional_bias TEXT, -- 'BULLISH', 'BEARISH', 'NEUTRAL'
  
  -- Signal generation restrictions
  avoid_signals_before_minutes INTEGER DEFAULT 30,
  avoid_signals_after_minutes INTEGER DEFAULT 60,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create session-based market analysis table
CREATE TABLE IF NOT EXISTS public.market_session_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL, -- 'Asian', 'European', 'American'
  session_date DATE NOT NULL,
  
  -- Volatility metrics per session
  avg_volatility NUMERIC,
  high_volatility_pairs TEXT[],
  low_volatility_pairs TEXT[],
  
  -- Volume analysis
  volume_profile JSONB,
  peak_activity_hours INTEGER[],
  
  -- Optimal trading conditions
  recommended_pairs TEXT[],
  avoid_pairs TEXT[],
  session_sentiment TEXT, -- 'RISK_ON', 'RISK_OFF', 'NEUTRAL'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(session_name, session_date)
);

-- Enhance existing trading_signals table with professional fields
ALTER TABLE public.trading_signals 
ADD COLUMN IF NOT EXISTS fibonacci_entry NUMERIC,
ADD COLUMN IF NOT EXISTS fibonacci_targets NUMERIC[],
ADD COLUMN IF NOT EXISTS pivot_entry NUMERIC,
ADD COLUMN IF NOT EXISTS session_optimal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS multi_timeframe_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS correlation_checked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS news_impact_assessed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS professional_grade BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tier_level INTEGER DEFAULT 1, -- 1, 2, or 3
ADD COLUMN IF NOT EXISTS ai_model_used TEXT,
ADD COLUMN IF NOT EXISTS analysis_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_confirmations TEXT[],
ADD COLUMN IF NOT EXISTS expected_duration_hours INTEGER,
ADD COLUMN IF NOT EXISTS market_regime TEXT,
ADD COLUMN IF NOT EXISTS volatility_profile TEXT;

-- Enable RLS on new tables
ALTER TABLE public.multi_timeframe_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_technical_indicators ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.professional_risk_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_validation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_correlation_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_events_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_session_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users to read market data
CREATE POLICY "Authenticated users can read multi-timeframe data" ON public.multi_timeframe_data
FOR SELECT USING (true);

CREATE POLICY "System can insert multi-timeframe data" ON public.multi_timeframe_data
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can read technical indicators" ON public.enhanced_technical_indicators
FOR SELECT USING (true);

CREATE POLICY "System can manage technical indicators" ON public.enhanced_technical_indicators
FOR ALL USING (true);

CREATE POLICY "Users can read risk management data" ON public.professional_risk_management
FOR SELECT USING (true);

CREATE POLICY "System can manage risk management data" ON public.professional_risk_management
FOR ALL USING (true);

CREATE POLICY "Users can read signal validation metrics" ON public.signal_validation_metrics
FOR SELECT USING (true);

CREATE POLICY "System can manage validation metrics" ON public.signal_validation_metrics
FOR ALL USING (true);

CREATE POLICY "Users can read correlation matrix" ON public.currency_correlation_matrix
FOR SELECT USING (true);

CREATE POLICY "System can update correlation matrix" ON public.currency_correlation_matrix
FOR ALL USING (true);

CREATE POLICY "Users can read economic events" ON public.economic_events_impact
FOR SELECT USING (true);

CREATE POLICY "System can manage economic events" ON public.economic_events_impact
FOR ALL USING (true);

CREATE POLICY "Users can read session analysis" ON public.market_session_analysis
FOR SELECT USING (true);

CREATE POLICY "System can manage session analysis" ON public.market_session_analysis
FOR ALL USING (true);

-- Create functions for automated maintenance
CREATE OR REPLACE FUNCTION public.cleanup_old_timeframe_data()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Keep 1000 records per symbol per timeframe (roughly 2-3 days of 1M data)
  DELETE FROM public.multi_timeframe_data 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY symbol, timeframe 
        ORDER BY timestamp DESC
      ) as rn
      FROM public.multi_timeframe_data
    ) ranked 
    WHERE rn > 1000
  );
  
  -- Clean technical indicators older than 7 days
  DELETE FROM public.enhanced_technical_indicators 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$function$;

-- Create function for automatic ATR calculation and updates
CREATE OR REPLACE FUNCTION public.calculate_atr_for_symbol(
  symbol_name TEXT,
  timeframe_name TEXT,
  period INTEGER DEFAULT 14
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $function$
DECLARE
  atr_value NUMERIC := 0;
BEGIN
  -- Calculate ATR from recent OHLC data
  SELECT AVG(
    GREATEST(
      high_price - low_price,
      ABS(high_price - LAG(close_price) OVER (ORDER BY timestamp)),
      ABS(low_price - LAG(close_price) OVER (ORDER BY timestamp))
    )
  )
  INTO atr_value
  FROM (
    SELECT high_price, low_price, close_price, timestamp
    FROM public.multi_timeframe_data
    WHERE symbol = symbol_name 
    AND timeframe = timeframe_name
    ORDER BY timestamp DESC
    LIMIT period + 1
  ) recent_data;
  
  RETURN COALESCE(atr_value, 0);
END;
$function$;

-- Create trigger function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_professional_risk_management_updated_at
  BEFORE UPDATE ON public.professional_risk_management
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_trigger();

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_trading_signals_professional_grade
ON public.trading_signals(professional_grade, created_at DESC) 
WHERE professional_grade = true;

CREATE INDEX IF NOT EXISTS idx_trading_signals_tier_level
ON public.trading_signals(tier_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trading_signals_quality_score
ON public.trading_signals(validation_score DESC, created_at DESC)
WHERE validation_score > 50;

-- Create materialized view for quick signal quality analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS public.signal_quality_dashboard AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour_bucket,
  tier_level,
  COUNT(*) as signals_generated,
  AVG(validation_score) as avg_quality_score,
  AVG(confidence) as avg_confidence,
  COUNT(*) FILTER (WHERE professional_grade = true) as professional_signals,
  AVG(analysis_cost) as avg_cost_per_signal,
  ARRAY_AGG(DISTINCT symbol) as symbols_analyzed
FROM public.trading_signals 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), tier_level
ORDER BY hour_bucket DESC, tier_level;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_signal_quality_dashboard_hour_tier
ON public.signal_quality_dashboard(hour_bucket DESC, tier_level);

-- Set up automated refresh for materialized view
-- Note: This would typically be done via pg_cron, but we'll document it for manual setup