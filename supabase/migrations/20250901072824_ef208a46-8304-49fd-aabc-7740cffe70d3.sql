
-- 1) Ensure required extensions (safe if they already exist)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 2) Jobs table (internal queue; RLS intentionally not enabled)
create table if not exists public.push_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('new_signal','target_hit','stop_loss','signal_complete','market_update')),
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  error text,
  retry_count int not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists push_notification_jobs_status_created_idx
  on public.push_notification_jobs (status, created_at);

comment on table public.push_notification_jobs is 'Internal queue for backend-only push notifications.';

-- 3) Helper to enqueue jobs
create or replace function public.enqueue_push_job(job_type text, payload jsonb)
returns void
language plpgsql
as $$
begin
  insert into public.push_notification_jobs (job_type, payload) values (job_type, payload);
end;
$$;

-- 4a) New signal trigger (only for centralized signals)
create or replace function public.trg_enqueue_new_signal()
returns trigger
language plpgsql
as $$
begin
  -- only enqueue for centralized signals if the column exists and is true; if column missing, comment out this guard
  if coalesce(new.is_centralized, true) = true then
    perform public.enqueue_push_job(
      'new_signal',
      jsonb_build_object(
        'signal_id', new.id,
        'symbol', new.symbol,
        'type', new.type,
        'price', new.price,
        'take_profits', new.take_profits,
        'stop_loss', new.stop_loss
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_insert_trading_signals on public.trading_signals;
create trigger trg_after_insert_trading_signals
after insert on public.trading_signals
for each row execute function public.trg_enqueue_new_signal();

-- 4b) Target hit trigger (fires when targets_hit length increases)
create or replace function public.trg_enqueue_target_hit()
returns trigger
language plpgsql
as $$
declare
  old_len int := coalesce(array_length(old.targets_hit,1), 0);
  new_len int := coalesce(array_length(new.targets_hit,1), 0);
  latest_target int;
  target_price numeric;
begin
  if new_len > old_len then
    latest_target := new.targets_hit[new_len];
    if new.take_profits is not null
       and latest_target between 1 and coalesce(array_length(new.take_profits,1), 0) then
      target_price := new.take_profits[latest_target];
    end if;

    perform public.enqueue_push_job(
      'target_hit',
      jsonb_build_object(
        'signal_id', new.id,
        'symbol', new.symbol,
        'type', new.type,
        'target_level', latest_target,
        'price', target_price
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_update_targets_hit on public.trading_signals;
create trigger trg_after_update_targets_hit
after update of targets_hit on public.trading_signals
for each row execute function public.trg_enqueue_target_hit();

-- 4c) Signal outcome trigger (stop loss or complete)
create or replace function public.trg_enqueue_signal_outcome()
returns trigger
language plpgsql
as $$
declare
  signal_rec record;
  notif_type text;
begin
  select * into signal_rec from public.trading_signals where id = new.signal_id;

  if coalesce(new.notes,'') ilike '%stop loss%' or coalesce(new.notes,'') ilike '%stop_loss%' then
    notif_type := 'stop_loss';
    perform public.enqueue_push_job(
      notif_type,
      jsonb_build_object(
        'signal_id', new.signal_id,
        'symbol', signal_rec.symbol,
        'type', signal_rec.type,
        'price', new.exit_price
      )
    );
  else
    notif_type := 'signal_complete';
    perform public.enqueue_push_job(
      notif_type,
      jsonb_build_object(
        'signal_id', new.signal_id,
        'symbol', signal_rec.symbol,
        'type', signal_rec.type,
        'pips', new.pnl_pips,
        'hit_target', new.hit_target,
        'target_level', new.target_hit_level
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_after_insert_signal_outcomes on public.signal_outcomes;
create trigger trg_after_insert_signal_outcomes
after insert on public.signal_outcomes
for each row execute function public.trg_enqueue_signal_outcome();

-- 4d) Market update trigger (high-impact only)
create or replace function public.trg_enqueue_market_update()
returns trigger
language plpgsql
as $$
begin
  if new.impact_level = 'high' then
    perform public.enqueue_push_job(
      'market_update',
      jsonb_build_object(
        'event_id', new.id,
        'currency', new.currency,
        'title', new.title,
        'impact', new.impact_level
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_insert_economic_events on public.economic_events;
create trigger trg_after_insert_economic_events
after insert on public.economic_events
for each row execute function public.trg_enqueue_market_update();

-- 5) Notify edge function immediately whenever a job is enqueued (best-effort, non-blocking)
create or replace function public.trg_notify_process_push_jobs()
returns trigger
language plpgsql
as $$
begin
  perform net.http_post(
    url:='https://ugtaodrvbpfeyhdgmisn.functions.supabase.co/functions/v1/process-push-jobs',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:=jsonb_build_object('job_id', new.id, 'source', 'db_trigger')
  );
  return new;
exception when others then
  -- Never block writes if HTTP fails
  return new;
end;
$$;

drop trigger if exists trg_after_insert_push_job on public.push_notification_jobs;
create trigger trg_after_insert_push_job
after insert on public.push_notification_jobs
for each row execute function public.trg_notify_process_push_jobs();

-- 6) Cron fallback every minute (in case HTTP notify fails)
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'process-push-jobs-every-minute') then
    perform cron.schedule(
      'process-push-jobs-every-minute',
      '* * * * *',
      $cron$
      select
        net.http_post(
          url:='https://ugtaodrvbpfeyhdgmisn.functions.supabase.co/functions/v1/process-push-jobs',
          headers:='{"Content-Type":"application/json"}'::jsonb,
          body:='{"source":"cron"}'::jsonb
        );
      $cron$
    );
  end if;
end
$$;
