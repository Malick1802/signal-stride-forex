-- Enable RLS on market data tables that currently have security warnings
ALTER TABLE public.live_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centralized_market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprehensive_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_sentiment ENABLE ROW LEVEL SECURITY;

-- Create read-only policies for authenticated users on live_price_history
CREATE POLICY "Authenticated users can read live price history" 
ON public.live_price_history 
FOR SELECT 
TO authenticated 
USING (true);

-- Create read-only policies for authenticated users on centralized_market_state
CREATE POLICY "Authenticated users can read centralized market state" 
ON public.centralized_market_state 
FOR SELECT 
TO authenticated 
USING (true);

-- Create read-only policies for authenticated users on comprehensive_market_data
CREATE POLICY "Authenticated users can read comprehensive market data" 
ON public.comprehensive_market_data 
FOR SELECT 
TO authenticated 
USING (true);

-- Create read-only policies for authenticated users on economic_events
CREATE POLICY "Authenticated users can read economic events" 
ON public.economic_events 
FOR SELECT 
TO authenticated 
USING (true);

-- Create read-only policies for authenticated users on technical_indicators
CREATE POLICY "Authenticated users can read technical indicators" 
ON public.technical_indicators 
FOR SELECT 
TO authenticated 
USING (true);

-- Create read-only policies for authenticated users on chart_patterns
CREATE POLICY "Authenticated users can read chart patterns" 
ON public.chart_patterns 
FOR SELECT 
TO authenticated 
USING (true);

-- Create read-only policies for authenticated users on market_sentiment
CREATE POLICY "Authenticated users can read market sentiment" 
ON public.market_sentiment 
FOR SELECT 
TO authenticated 
USING (true);