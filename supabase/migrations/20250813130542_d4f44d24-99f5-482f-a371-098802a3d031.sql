-- Secure ai_analysis_cache with a deny-all policy (service role bypasses RLS)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_analysis_cache' AND policyname = 'Deny all access'
  ) THEN
    CREATE POLICY "Deny all access"
    ON public.ai_analysis_cache
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;