
-- Create the has_role function that's missing
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = _role
    );
$$;

-- Create admin-specific tables and update user roles
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create admin activity logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin activity logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin activity logs (only admins can view)
CREATE POLICY "Admins can view all activity logs"
  ON public.admin_activity_logs
  FOR ALL
  TO authenticated
  USING (public.has_role('admin'::app_role));

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admin notifications (users can only see their own)
CREATE POLICY "Users can view their own admin notifications"
  ON public.admin_notifications
  FOR ALL
  TO authenticated
  USING (admin_user_id = auth.uid());
