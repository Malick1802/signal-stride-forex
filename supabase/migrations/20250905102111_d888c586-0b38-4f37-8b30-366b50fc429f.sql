-- Add audit columns to trading_signals table for AI model tracking
ALTER TABLE public.trading_signals 
ADD COLUMN IF NOT EXISTS ai_model_used TEXT,
ADD COLUMN IF NOT EXISTS analysis_cost NUMERIC DEFAULT 0;

-- Create function invocations audit table
CREATE TABLE IF NOT EXISTS public.function_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  source TEXT,
  trigger_type TEXT,
  run_id TEXT,
  user_id UUID,
  pairs_analyzed INTEGER DEFAULT 0,
  tier2_count INTEGER DEFAULT 0,
  tier3_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on function_invocations
ALTER TABLE public.function_invocations ENABLE ROW LEVEL SECURITY;

-- Create policies for function_invocations
CREATE POLICY "Admins can view all function invocations"
  ON public.function_invocations
  FOR SELECT
  USING (has_role('admin'::app_role));

CREATE POLICY "System can insert function invocations"
  ON public.function_invocations
  FOR INSERT
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_function_invocations_created_at ON public.function_invocations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_function_invocations_function_name ON public.function_invocations(function_name);
CREATE INDEX IF NOT EXISTS idx_trading_signals_ai_model ON public.trading_signals(ai_model_used);