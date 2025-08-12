
-- Ensure required extensions exist (safe if already enabled)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Unschedule any existing job with the same name to avoid duplicates
do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'invoke-real-time-tick-generator-mid-minute'
  ) then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'invoke-real-time-tick-generator-mid-minute';
  end if;
end
$$;

-- Schedule the real-time-tick-generator to run every minute,
-- but sleep 30s first so it fires mid-minute (interleaves with baseline 60s updates)
select
  cron.schedule(
    'invoke-real-time-tick-generator-mid-minute',
    '* * * * *', -- every minute
    $cron$
    do $do$
    begin
      perform pg_sleep(30); -- fire ~:30 each minute
      perform net.http_post(
        url := 'https://ugtaodrvbpfeyhdgmisn.supabase.co/functions/v1/real-time-tick-generator',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjA2MTUsImV4cCI6MjA0OTYzNjYxNX0.Z-71hRCpHB0YivrsTb2kZQdObcF42BQVYIQ8_yMb_JM',
          'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjA2MTUsImV4cCI6MjA0OTYzNjYxNX0.Z-71hRCpHB0YivrsTb2kZQdObcF42BQVYIQ8_yMb_JM'
        ),
        body := jsonb_build_object(
          'source','pg_cron',
          'note','mid-minute tick generation (30s after minute)',
          'invoked_at', now()
        )
      );
    end
    $do$;
    $cron$
  );
