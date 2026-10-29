-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unscheduling previous jobs if they exist
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('daily-trend-sync-6am', 'multi-trend-sync-5x-daily');
exception when others then
  null;
end $$;

-- Schedule multi-trend-sync 5 times per day (UTC):
-- 00:30 UTC (06:00 AM IST)
-- 05:30 UTC (11:00 AM IST)
-- 09:30 UTC (03:00 PM IST)
-- 12:30 UTC (06:00 PM IST)
-- 15:30 UTC (09:00 PM IST)
-- Extracts breakout videos across 4 categories with real-time velocity metrics
select cron.schedule(
  'multi-trend-sync-5x-daily',
  '30 0,5,9,12,15 * * *',
  $$
  select net.http_post(
    url := 'https://unowbqmjwzofklnhbkbc.supabase.co/functions/v1/daily-trend-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
