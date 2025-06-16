
-- Create table for storing phone verification codes
CREATE TABLE public.phone_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Add Row Level Security
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own verification codes
CREATE POLICY "Users can access their own verification codes" 
  ON public.phone_verification_codes 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_phone_verification_codes_user_id ON public.phone_verification_codes(user_id);
CREATE INDEX idx_phone_verification_codes_expires_at ON public.phone_verification_codes(expires_at);

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM phone_verification_codes 
  WHERE expires_at < now();
END;
$$;
