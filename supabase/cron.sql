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

-- Schedule multi-trend-sync 5 times per day:
-- 6:00 AM, 11:00 AM, 3:00 PM (15:00), 6:00 PM (18:00), and 9:00 PM (21:00)
-- Extracts 100 breakout videos per run across 4 categories (500 videos/day)
select cron.schedule(
  'multi-trend-sync-5x-daily',
  '0 6,11,15,18,21 * * *',
  $$
  select net.http_post(
    url := 'https://unowbqmjwzofklnhbkbc.supabase.co/functions/v1/daily-trend-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
