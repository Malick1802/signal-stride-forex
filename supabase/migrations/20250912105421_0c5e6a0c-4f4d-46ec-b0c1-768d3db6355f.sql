-- Create database triggers for push notification automation

-- 1. Trigger for new trading signals (INSERT)
CREATE OR REPLACE FUNCTION trg_enqueue_new_signal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

-- 2. Trigger for target hits (UPDATE on trading_signals)
CREATE OR REPLACE FUNCTION trg_enqueue_target_hit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

-- 3. Trigger for signal outcomes
CREATE OR REPLACE FUNCTION trg_enqueue_signal_outcome()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

-- 4. Trigger for market updates (economic events)
CREATE OR REPLACE FUNCTION trg_enqueue_market_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

-- 5. Trigger to automatically call process-push-jobs function
CREATE OR REPLACE FUNCTION trg_notify_process_push_jobs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

-- Create the actual triggers on tables
DROP TRIGGER IF EXISTS trigger_new_signal ON trading_signals;
CREATE TRIGGER trigger_new_signal
  AFTER INSERT ON trading_signals
  FOR EACH ROW EXECUTE FUNCTION trg_enqueue_new_signal();

DROP TRIGGER IF EXISTS trigger_target_hit ON trading_signals;
CREATE TRIGGER trigger_target_hit
  AFTER UPDATE ON trading_signals
  FOR EACH ROW EXECUTE FUNCTION trg_enqueue_target_hit();

DROP TRIGGER IF EXISTS trigger_signal_outcome ON signal_outcomes;
CREATE TRIGGER trigger_signal_outcome
  AFTER INSERT ON signal_outcomes
  FOR EACH ROW EXECUTE FUNCTION trg_enqueue_signal_outcome();

DROP TRIGGER IF EXISTS trigger_market_update ON economic_events;
CREATE TRIGGER trigger_market_update
  AFTER INSERT ON economic_events
  FOR EACH ROW EXECUTE FUNCTION trg_enqueue_market_update();

DROP TRIGGER IF EXISTS trigger_notify_push_jobs ON push_notification_jobs;
CREATE TRIGGER trigger_notify_push_jobs
  AFTER INSERT ON push_notification_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_notify_process_push_jobs();