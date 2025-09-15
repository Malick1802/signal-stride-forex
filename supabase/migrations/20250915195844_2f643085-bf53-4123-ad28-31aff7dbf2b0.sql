-- Drop any legacy CHECK constraints that restrict ULTRA
ALTER TABLE public.app_settings 
  DROP CONSTRAINT IF EXISTS app_settings_signal_threshold_level_check;
ALTER TABLE public.app_settings 
  DROP CONSTRAINT IF EXISTS signal_threshold_level_check;

-- Ensure clients can call the RPC (function is SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.update_app_setting(text, text) TO anon, authenticated;