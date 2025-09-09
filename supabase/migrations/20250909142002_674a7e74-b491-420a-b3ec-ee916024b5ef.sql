-- Phase 1: Historical Data Infrastructure for 70%+ Win Rate System

-- Historical market data table for 5-10 years of backtesting data
CREATE TABLE IF NOT EXISTS public.historical_market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1D', -- 1D, 4H, 1H, 15M, 5M, 1M
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'alpha_vantage',
  market_session TEXT, -- Asian, London, NY, Overlap
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, timeframe, timestamp)
);

-- Backtesting configurations for parameter optimization
CREATE TABLE IF NOT EXISTS public.backtesting_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name TEXT NOT NULL,
  parameters JSONB NOT NULL, -- {rsi_period: 14, rsi_buy: 25, rsi_sell: 75, etc.}
  timeframe TEXT NOT NULL,
  test_period_start DATE NOT NULL,
  test_period_end DATE NOT NULL,
  win_rate NUMERIC,
  profit_factor NUMERIC,
  max_drawdown_percent NUMERIC,
  sharpe_ratio NUMERIC,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  average_win_pips NUMERIC,
  average_loss_pips NUMERIC,
  testing_status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance tracking for continuous improvement
CREATE TABLE IF NOT EXISTS public.signal_performance_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.trading_signals(id),
  config_id UUID REFERENCES public.backtesting_configurations(id),
  symbol TEXT NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  stop_loss NUMERIC NOT NULL,
  take_profits NUMERIC[] NOT NULL,
  outcome TEXT, -- win, loss, breakeven, open
  pips_result INTEGER,
  risk_reward_achieved NUMERIC,
  tier_level INTEGER NOT NULL,
  confidence_score NUMERIC NOT NULL,
  market_regime TEXT, -- trending, ranging, volatile
  session TEXT, -- Asian, London, NY, Overlap
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Economic events calendar for news-aware filtering
CREATE TABLE IF NOT EXISTS public.economic_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  currency TEXT NOT NULL,
  event_name TEXT NOT NULL,
  impact_level TEXT NOT NULL, -- high, medium, low
  previous_value TEXT,
  forecast_value TEXT,
  actual_value TEXT,
  affected_pairs TEXT[], -- pairs likely to be affected
  avoid_before_minutes INTEGER DEFAULT 30,
  avoid_after_minutes INTEGER DEFAULT 60,
  volatility_increase_expected NUMERIC, -- expected volatility multiplier
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monthly recalibration results
CREATE TABLE IF NOT EXISTS public.monthly_recalibrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recalibration_date DATE NOT NULL,
  previous_config_id UUID REFERENCES public.backtesting_configurations(id),
  new_config_id UUID REFERENCES public.backtesting_configurations(id),
  performance_improvement NUMERIC, -- win rate improvement
  parameter_changes JSONB, -- what changed
  market_regime_analysis JSONB, -- regime during calibration period
  recalibration_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_historical_market_data_symbol_timeframe_timestamp 
ON public.historical_market_data(symbol, timeframe, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_backtesting_configurations_win_rate 
ON public.backtesting_configurations(win_rate DESC);

CREATE INDEX IF NOT EXISTS idx_signal_performance_tracking_symbol_entry_time 
ON public.signal_performance_tracking(symbol, entry_time DESC);

CREATE INDEX IF NOT EXISTS idx_economic_calendar_events_time_impact 
ON public.economic_calendar_events(event_time, impact_level);

-- Enable RLS
ALTER TABLE public.historical_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtesting_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_recalibrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to read, system to write
CREATE POLICY "Users can read historical data" ON public.historical_market_data FOR SELECT USING (true);
CREATE POLICY "System can manage historical data" ON public.historical_market_data FOR ALL USING (true);

CREATE POLICY "Users can read backtesting configs" ON public.backtesting_configurations FOR SELECT USING (true);
CREATE POLICY "System can manage backtesting configs" ON public.backtesting_configurations FOR ALL USING (true);

CREATE POLICY "Users can read performance tracking" ON public.signal_performance_tracking FOR SELECT USING (true);
CREATE POLICY "System can manage performance tracking" ON public.signal_performance_tracking FOR ALL USING (true);

CREATE POLICY "Users can read economic calendar" ON public.economic_calendar_events FOR SELECT USING (true);
CREATE POLICY "System can manage economic calendar" ON public.economic_calendar_events FOR ALL USING (true);

CREATE POLICY "Users can read recalibrations" ON public.monthly_recalibrations FOR SELECT USING (true);
CREATE POLICY "System can manage recalibrations" ON public.monthly_recalibrations FOR ALL USING (true);