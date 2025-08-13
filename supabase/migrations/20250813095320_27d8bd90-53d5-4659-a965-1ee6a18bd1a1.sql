
-- Enable required extensions if they aren't already
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Unschedule any existing job with the same name to avoid duplicates
do $$
begin
  perform cron.unschedule('invoke-real-time-tick-generator-every-minute');
exception when others then
  -- ignore if the job didn't exist
  null;
end
$$;

-- Schedule the real-time tick generator to run every minute
select
  cron.schedule(
    'invoke-real-time-tick-generator-every-minute',
    '* * * * *', -- every minute
    $$
    select
      net.http_post(
        url:='https://ugtaodrvbpfeyhdgmisn.functions.supabase.co/functions/v1/real-time-tick-generator',
        headers:='{
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjA2MTUsImV4cCI6MjA0OTYzNjYxNX0.Z-71hRCpHB0YivrsTb2kZQdObcF42BQVYIQ8_yMb_JM"
        }'::jsonb,
        body:= json_build_object(
          'source','pg_cron',
          'scheduled_at', now()
        )::jsonb
      ) as request_id;
    $$
  );
