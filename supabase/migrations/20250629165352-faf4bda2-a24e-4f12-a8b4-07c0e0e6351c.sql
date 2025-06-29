
-- Add push notification preferences to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN push_notifications_enabled boolean DEFAULT true,
ADD COLUMN push_new_signals boolean DEFAULT true,
ADD COLUMN push_targets_hit boolean DEFAULT true,
ADD COLUMN push_stop_loss boolean DEFAULT true,
ADD COLUMN push_signal_complete boolean DEFAULT true,
ADD COLUMN push_market_updates boolean DEFAULT false,
ADD COLUMN push_sound_enabled boolean DEFAULT true,
ADD COLUMN push_vibration_enabled boolean DEFAULT true;
