-- Create optimal trading parameters table to store backtested optimal configs per pair
CREATE TABLE public.optimal_trading_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1H',
  rsi_oversold INTEGER NOT NULL DEFAULT 30,
  rsi_overbought INTEGER NOT NULL DEFAULT 70,
  ema_fast_period INTEGER NOT NULL DEFAULT 12,
  ema_slow_period INTEGER NOT NULL DEFAULT 26,
  atr_period INTEGER NOT NULL DEFAULT 14,
  confluence_required INTEGER NOT NULL DEFAULT 3,
  min_confluence_score INTEGER NOT NULL DEFAULT 55,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  profit_factor NUMERIC NOT NULL DEFAULT 0,
  max_drawdown NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  avg_win_pips NUMERIC NOT NULL DEFAULT 0,
  avg_loss_pips NUMERIC NOT NULL DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  market_session TEXT DEFAULT 'all',
  volatility_regime TEXT DEFAULT 'normal',
  backtested_from DATE NOT NULL,
  backtested_to DATE NOT NULL,
  last_optimized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, timeframe, market_session, volatility_regime)
);

-- Create backtesting results table for detailed tracking
CREATE TABLE public.backtesting_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  parameters JSONB NOT NULL,
  win_rate NUMERIC NOT NULL,
  profit_factor NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  losing_trades INTEGER NOT NULL,
  avg_win_pips NUMERIC NOT NULL,
  avg_loss_pips NUMERIC NOT NULL,
  sharpe_ratio NUMERIC DEFAULT 0,
  test_period_start DATE NOT NULL,
  test_period_end DATE NOT NULL,
  market_session TEXT DEFAULT 'all',
  volatility_regime TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create signal performance tracking table
CREATE TABLE public.signal_performance_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  stop_loss_price NUMERIC NOT NULL,
  take_profit_prices NUMERIC[] NOT NULL,
  outcome TEXT, -- 'win', 'loss', 'breakeven', 'active'
  pips_result INTEGER DEFAULT 0,
  duration_hours INTEGER,
  market_session TEXT,
  volatility_regime TEXT,
  parameters_used JSONB, -- stores the actual parameters used for this signal
  confidence_score INTEGER,
  exit_reason TEXT, -- 'stop_loss', 'take_profit_1', 'take_profit_2', 'manual', 'expired'
  signal_generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  signal_closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.optimal_trading_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtesting_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_performance_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for optimal trading parameters
CREATE POLICY "System can manage optimal parameters" ON public.optimal_trading_parameters
  FOR ALL USING (true);

CREATE POLICY "Users can read optimal parameters" ON public.optimal_trading_parameters
  FOR SELECT USING (true);

-- Create policies for backtesting results
CREATE POLICY "System can manage backtesting results" ON public.backtesting_results
  FOR ALL USING (true);

CREATE POLICY "Users can read backtesting results" ON public.backtesting_results
  FOR SELECT USING (true);

-- Create policies for signal performance tracking
CREATE POLICY "System can manage signal performance" ON public.signal_performance_tracking
  FOR ALL USING (true);

CREATE POLICY "Users can read signal performance" ON public.signal_performance_tracking
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_optimal_parameters_symbol ON public.optimal_trading_parameters(symbol);
CREATE INDEX idx_optimal_parameters_session ON public.optimal_trading_parameters(market_session, volatility_regime);
CREATE INDEX idx_backtesting_results_symbol ON public.backtesting_results(symbol, timeframe);
CREATE INDEX idx_signal_performance_symbol ON public.signal_performance_tracking(symbol);
CREATE INDEX idx_signal_performance_outcome ON public.signal_performance_tracking(outcome);
CREATE INDEX idx_signal_performance_generated_at ON public.signal_performance_tracking(signal_generated_at);

-- Create trigger for updated_at
CREATE TRIGGER update_optimal_parameters_updated_at
  BEFORE UPDATE ON public.optimal_trading_parameters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get optimal parameters for a symbol
CREATE OR REPLACE FUNCTION public.get_optimal_parameters(symbol_name TEXT, session_name TEXT DEFAULT 'all', volatility_name TEXT DEFAULT 'normal')
RETURNS TABLE(
  rsi_oversold INTEGER,
  rsi_overbought INTEGER,
  ema_fast_period INTEGER,
  ema_slow_period INTEGER,
  atr_period INTEGER,
  confluence_required INTEGER,
  min_confluence_score INTEGER,
  win_rate NUMERIC,
  profit_factor NUMERIC
) 
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    otp.rsi_oversold,
    otp.rsi_overbought,
    otp.ema_fast_period,
    otp.ema_slow_period,
    otp.atr_period,
    otp.confluence_required,
    otp.min_confluence_score,
    otp.win_rate,
    otp.profit_factor
  FROM public.optimal_trading_parameters otp
  WHERE otp.symbol = symbol_name 
    AND otp.market_session = session_name
    AND otp.volatility_regime = volatility_name
  ORDER BY otp.last_optimized_at DESC
  LIMIT 1;
END;
$function$;