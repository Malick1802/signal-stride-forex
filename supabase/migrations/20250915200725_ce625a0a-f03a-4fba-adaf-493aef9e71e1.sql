-- Clean slate: Remove all signals and related data while preserving market data

-- Step 1: Delete signal outcomes first (foreign key dependent)
DELETE FROM public.signal_outcomes;

-- Step 2: Delete AI analysis records linked to signals
DELETE FROM public.ai_analysis WHERE signal_id IS NOT NULL;

-- Step 3: Delete real trades linked to signals  
DELETE FROM public.real_trades WHERE signal_id IS NOT NULL;

-- Step 4: Delete professional risk management records
DELETE FROM public.professional_risk_management WHERE signal_id IS NOT NULL;

-- Step 5: Delete cached signals
DELETE FROM public.cached_signals;

-- Step 6: Delete all trading signals (both active and expired)
DELETE FROM public.trading_signals;

-- Reset any AI analysis cache for fresh analysis
DELETE FROM public.ai_analysis_cache;