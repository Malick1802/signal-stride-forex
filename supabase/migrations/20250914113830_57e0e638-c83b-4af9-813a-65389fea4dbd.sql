-- Fix RLS policies for admin access to user management

-- Update profiles table RLS to allow admins to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (has_role('admin'::app_role));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (has_role('admin'::app_role));

CREATE POLICY "Admins can delete profiles" 
ON public.profiles FOR DELETE 
USING (has_role('admin'::app_role));

-- Update user_roles table RLS for admin access
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (has_role('admin'::app_role));

-- Update subscribers table RLS for admin access
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

CREATE POLICY "Users can view their own subscription" 
ON public.subscribers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.subscribers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
ON public.subscribers FOR SELECT 
USING (has_role('admin'::app_role));

CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscribers FOR ALL 
USING (has_role('admin'::app_role));

-- Create a function to make a user an admin (for initial setup)
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;