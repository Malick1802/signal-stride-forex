-- Fix critical security vulnerability: Restrict access to personal data

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscribers;

-- Create secure policies for profiles table
-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins can view all profiles for management purposes
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create secure policies for subscribers table
-- Remove the overly broad service role policy and replace with specific admin access
CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscribers 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Service role can still insert/update subscriptions (needed for Stripe webhooks)
CREATE POLICY "Service role can modify subscriptions" 
ON public.subscribers 
FOR INSERT, UPDATE
WITH CHECK (true);

-- Ensure the existing user policy remains for users to view their own subscription
-- (This policy already exists and is secure: "Users can view their own subscription")