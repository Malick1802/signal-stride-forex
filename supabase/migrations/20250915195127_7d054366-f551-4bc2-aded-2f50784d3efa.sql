-- Remove the old CHECK constraint that's blocking ULTRA level
ALTER TABLE public.app_settings 
DROP CONSTRAINT IF EXISTS app_settings_signal_threshold_level_check;