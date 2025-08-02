-- Add push notification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN push_token TEXT,
ADD COLUMN device_type TEXT,
ADD COLUMN push_enabled BOOLEAN DEFAULT true;