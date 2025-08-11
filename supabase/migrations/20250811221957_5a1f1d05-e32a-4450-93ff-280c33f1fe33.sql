-- CRITICAL SECURITY FIX: Remove public access to customer personal data

-- Drop the dangerous public policy that allows anyone to read all profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Create secure policy: Users can only view their own profile
CREATE POLICY "Users can view their own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create admin access policy for management purposes
CREATE POLICY "Admins can view all profiles for management" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));