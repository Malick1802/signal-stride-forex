
-- Add SMS notification fields to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_number TEXT,
ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN sms_new_signals BOOLEAN DEFAULT true,
ADD COLUMN sms_targets_hit BOOLEAN DEFAULT true,
ADD COLUMN sms_stop_loss BOOLEAN DEFAULT true,
ADD COLUMN sms_verified BOOLEAN DEFAULT false;

-- Add a comment to document the phone_number format
COMMENT ON COLUMN public.profiles.phone_number IS 'Phone number in international format (e.g., +1234567890)';
