
-- 1) Create a monitoring view to list any cron jobs that look like time-based expiration
--    (exclude essential generation/fetch/stream/tick tasks)
CREATE OR REPLACE VIEW public.harmful_signal_expiration_cron_jobs AS
SELECT
  j.jobid,
  j.jobname,
  j.schedule,
  j.command,
  j.nodename,
  j.nodeport,
  j.active
FROM cron.job AS j
WHERE
  (j.jobname ~* '(expire|expiration|timeout|cleanup)')
  AND (j.jobname !~* '(generate|fetch|stream|tick)');

-- 2) Unschedule time-based expiration cron jobs safely.
--    This removes harmful time-based expiration while preserving essential functionality.
DO $$
DECLARE
  r RECORD;
  removed_count INT := 0;
BEGIN
  -- Ensure pg_cron is available
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'cron'
  ) THEN
    RAISE NOTICE 'pg_cron schema not found; no cron jobs to unschedule.';
    RETURN;
  END IF;

  -- Explicitly target known harmful job names (if they exist)
  FOR r IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE jobname IN (
      'expire-old-signals',
      'signal-expiration-cleanup',
      'auto-expire-signals',
      'signal-timeout-check',
      'cleanup-expired-signals',
      'batch-signal-expiration',
      'hourly-signal-cleanup',
      'signal-expiration-hourly'
    )
  LOOP
    PERFORM cron.unschedule(r.jobid);
    removed_count := removed_count + 1;
    RAISE NOTICE 'Removed cron job by name: % (id: %)', r.jobname, r.jobid;
  END LOOP;

  -- Broad pattern-based removal for any lingering jobs that look like expiration,
  -- excluding essential generate/fetch/stream/tick jobs.
  FOR r IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE jobname ~* '(expire|expiration|timeout|cleanup)'
      AND jobname !~* '(generate|fetch|stream|tick)'
  LOOP
    PERFORM cron.unschedule(r.jobid);
    removed_count := removed_count + 1;
    RAISE NOTICE 'Removed cron job by pattern: % (id: %)', r.jobname, r.jobid;
  END LOOP;

  RAISE NOTICE 'Time-based expiration cleanup complete. Total jobs removed: %', removed_count;
END
$$;

-- 3) Quick check (optional): select from the monitoring view to confirm it's empty post-cleanup
-- SELECT * FROM public.harmful_signal_expiration_cron_jobs;
