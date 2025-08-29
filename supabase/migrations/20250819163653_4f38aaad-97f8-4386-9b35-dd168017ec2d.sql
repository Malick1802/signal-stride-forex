-- Add FastForex metadata columns for accurate price tracking and change detection
ALTER TABLE public.centralized_market_state 
ADD COLUMN IF NOT EXISTS fastforex_price NUMERIC,
ADD COLUMN IF NOT EXISTS fastforex_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS price_change_detected BOOLEAN DEFAULT false;

ALTER TABLE public.live_price_history
ADD COLUMN IF NOT EXISTS fastforex_price NUMERIC,
ADD COLUMN IF NOT EXISTS fastforex_timestamp TIMESTAMP WITH TIME ZONE;

-- Add index for efficient FastForex change detection queries
CREATE INDEX IF NOT EXISTS idx_centralized_market_state_fastforex_timestamp ON public.centralized_market_state(fastforex_timestamp);
CREATE INDEX IF NOT EXISTS idx_live_price_history_fastforex_timestamp ON public.live_price_history(fastforex_timestamp);

-- Function to detect FastForex price changes and update change detection flag
CREATE OR REPLACE FUNCTION public.detect_fastforex_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if fastforex_price is provided
  IF NEW.fastforex_price IS NOT NULL AND NEW.fastforex_timestamp IS NOT NULL THEN
    -- Check if price has actually changed from previous FastForex price
    IF OLD IS NULL OR OLD.fastforex_price IS NULL OR OLD.fastforex_price != NEW.fastforex_price THEN
      NEW.price_change_detected = true;
    ELSE
      NEW.price_change_detected = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for FastForex change detection
DROP TRIGGER IF EXISTS trigger_detect_fastforex_price_change ON public.centralized_market_state;
CREATE TRIGGER trigger_detect_fastforex_price_change
  BEFORE INSERT OR UPDATE ON public.centralized_market_state
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_fastforex_price_change();