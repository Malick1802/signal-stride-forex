-- Fix market_structure_trends timeframe constraint to use 'D' instead of '1D'
-- This aligns with the multi_timeframe_data table which uses 'D'

-- Drop the old constraint
ALTER TABLE public.market_structure_trends 
DROP CONSTRAINT IF EXISTS market_structure_trends_timeframe_check;

-- Add new constraint with 'D' instead of '1D'
ALTER TABLE public.market_structure_trends 
ADD CONSTRAINT market_structure_trends_timeframe_check 
CHECK (timeframe IN ('W', 'D', '4H'));

-- Verify no existing data violates the new constraint
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.market_structure_trends
  WHERE timeframe NOT IN ('W', 'D', '4H');
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with invalid timeframe values', invalid_count;
  END IF;
  
  RAISE NOTICE 'Constraint updated successfully. All existing rows are valid.';
END $$;