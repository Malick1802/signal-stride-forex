-- Create tables for 70%+ win rate pipeline performance tracking and historical backtesting

-- Performance tracking for live signals
CREATE TABLE IF NOT EXISTS public.signal_performance_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.trading_signals(id),
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  pair TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- BUY/SELL
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  pips_profit NUMERIC,
  win BOOLEAN, -- TRUE if profitable, FALSE if loss, NULL if still active
  target_level_hit INTEGER, -- Which take profit was hit (1,2,3) or NULL if stop loss
  tier_level INTEGER NOT NULL, -- 1, 2, or 3
  confidence_score NUMERIC NOT NULL,
  actual_risk_reward NUMERIC, -- Actual RR achieved
  session_volatility NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Historical backtesting results for parameter optimization
CREATE TABLE IF NOT EXISTS public.backtesting_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '5M',
  test_period_start DATE NOT NULL,
  test_period_end DATE NOT NULL,
  parameters JSONB NOT NULL, -- RSI levels, MA periods, confidence thresholds, etc.
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0, -- Percentage
  profit_factor NUMERIC NOT NULL DEFAULT 0,
  max_drawdown_percent NUMERIC NOT NULL DEFAULT 0,
  avg_win_pips NUMERIC NOT NULL DEFAULT 0,
  avg_loss_pips NUMERIC NOT NULL DEFAULT 0,
  reward_risk_ratio NUMERIC NOT NULL DEFAULT 0,
  sharpe_ratio NUMERIC,
  total_pips NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Optimal parameter configurations (winners from backtesting)
CREATE TABLE IF NOT EXISTS public.optimal_trading_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '5M',
  tier_1_params JSONB NOT NULL, -- RSI levels, MA periods, confluence requirements
  tier_2_params JSONB NOT NULL, -- Confidence thresholds, prompt variations
  tier_3_params JSONB NOT NULL, -- Quality thresholds, risk parameters
  win_rate_achieved NUMERIC NOT NULL,
  profit_factor_achieved NUMERIC NOT NULL,
  max_drawdown_achieved NUMERIC NOT NULL,
  total_trades_tested INTEGER NOT NULL,
  backtesting_period_start DATE NOT NULL,
  backtesting_period_end DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE, -- Currently used parameters
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for active configurations (only one active config per pair/timeframe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_optimal_params_active_unique 
ON public.optimal_trading_parameters(pair, timeframe) WHERE active = TRUE;

-- Monthly recalibration tracking
CREATE TABLE IF NOT EXISTS public.monthly_recalibration_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recalibration_date DATE NOT NULL,
  pairs_recalibrated TEXT[] NOT NULL,
  old_avg_win_rate NUMERIC,
  new_avg_win_rate NUMERIC,
  performance_improvement NUMERIC, -- Percentage improvement
  parameter_changes JSONB, -- What changed in the parameters
  market_regime_analysis JSONB, -- Bull/bear/sideways analysis
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Economic calendar integration for avoiding high-volatility periods
CREATE TABLE IF NOT EXISTS public.economic_calendar_high_impact (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  currency TEXT NOT NULL, -- USD, EUR, GBP, etc.
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  impact_level TEXT NOT NULL CHECK (impact_level IN ('HIGH', 'MEDIUM', 'LOW')),
  affected_pairs TEXT[] NOT NULL, -- EURUSD, GBPUSD, etc.
  avoid_minutes_before INTEGER NOT NULL DEFAULT 30,
  avoid_minutes_after INTEGER NOT NULL DEFAULT 60,
  volatility_increase_expected NUMERIC, -- Expected volatility multiplier
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 week')
);

-- Enable RLS on new tables
ALTER TABLE public.signal_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtesting_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimal_trading_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_recalibration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar_high_impact ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow system operations and admin access
CREATE POLICY "System can manage performance tracking" ON public.signal_performance_tracking FOR ALL USING (true);
CREATE POLICY "System can manage backtesting results" ON public.backtesting_results FOR ALL USING (true);
CREATE POLICY "System can manage optimal parameters" ON public.optimal_trading_parameters FOR ALL USING (true);
CREATE POLICY "System can manage recalibration history" ON public.monthly_recalibration_history FOR ALL USING (true);
CREATE POLICY "System can manage economic calendar" ON public.economic_calendar_high_impact FOR ALL USING (true);

-- Users can read performance data
CREATE POLICY "Users can read performance tracking" ON public.signal_performance_tracking FOR SELECT USING (true);
CREATE POLICY "Users can read backtesting results" ON public.backtesting_results FOR SELECT USING (true);
CREATE POLICY "Users can read optimal parameters" ON public.optimal_trading_parameters FOR SELECT USING (true);
CREATE POLICY "Users can read recalibration history" ON public.monthly_recalibration_history FOR SELECT USING (true);
CREATE POLICY "Users can read economic calendar" ON public.economic_calendar_high_impact FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_signal_performance_pair_time ON public.signal_performance_tracking(pair, entry_time);
CREATE INDEX IF NOT EXISTS idx_backtesting_results_pair_winrate ON public.backtesting_results(pair, win_rate);
CREATE INDEX IF NOT EXISTS idx_economic_calendar_time ON public.economic_calendar_high_impact(event_time);
CREATE INDEX IF NOT EXISTS idx_recalibration_date ON public.monthly_recalibration_history(recalibration_date);

-- Update timestamp trigger for optimal_trading_parameters
CREATE OR REPLACE FUNCTION public.update_optimal_params_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_optimal_params_updated_at
  BEFORE UPDATE ON public.optimal_trading_parameters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_optimal_params_timestamp();