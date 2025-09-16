-- Fix RLS security issue by enabling RLS on table that may be missing it
-- Check and enable RLS on harmful_signal_expiration_cron_jobs if not already enabled

-- Enable RLS on harmful_signal_expiration_cron_jobs 
ALTER TABLE public.harmful_signal_expiration_cron_jobs ENABLE ROW LEVEL SECURITY;

-- Create a restrictive policy for this table since it appears to be a system table
CREATE POLICY "Deny all access to harmful cron jobs table" 
ON public.harmful_signal_expiration_cron_jobs 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);