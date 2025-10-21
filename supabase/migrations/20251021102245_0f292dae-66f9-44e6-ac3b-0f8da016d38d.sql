-- Add cron job to update market structure every 4 hours
SELECT cron.schedule(
  'update-market-structure-all-timeframes',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url:='https://ugtaodrvbpfeyhdgmisn.supabase.co/functions/v1/update-market-structure',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjA2MTUsImV4cCI6MjA0OTYzNjYxNX0.Z-71hRCpHB0YivrsTb2kZQdObcF42BQVYIQ8_yMb_JM"}'::jsonb,
    body:='{"timeframe": "W"}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'update-market-structure-daily',
  '15 */4 * * *',
  $$
  SELECT net.http_post(
    url:='https://ugtaodrvbpfeyhdgmisn.supabase.co/functions/v1/update-market-structure',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjA2MTUsImV4cCI6MjA0OTYzNjYxNX0.Z-71hRCpHB0YivrsTb2kZQdObcF42BQVYIQ8_yMb_JM"}'::jsonb,
    body:='{"timeframe": "D"}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'update-market-structure-4h',
  '30 */4 * * *',
  $$
  SELECT net.http_post(
    url:='https://ugtaodrvbpfeyhdgmisn.supabase.co/functions/v1/update-market-structure',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjA2MTUsImV4cCI6MjA0OTYzNjYxNX0.Z-71hRCpHB0YivrsTb2kZQdObcF42BQVYIQ8_yMb_JM"}'::jsonb,
    body:='{"timeframe": "4H"}'::jsonb
  ) as request_id;
  $$
);