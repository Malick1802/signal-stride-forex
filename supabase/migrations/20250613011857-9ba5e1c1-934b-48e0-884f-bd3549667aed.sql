
-- Remove the harmful time-based expiration cron job
SELECT cron.unschedule('expire-old-signals');
