-- Create triggers to enable push notifications for trading signals

-- 1. Trigger for new signal creation
CREATE TRIGGER trg_enqueue_new_signal_on_insert
    AFTER INSERT ON public.trading_signals
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enqueue_new_signal();

-- 2. Trigger for target hits (when targets_hit array is updated)
CREATE TRIGGER trg_enqueue_target_hit_on_update
    AFTER UPDATE OF targets_hit ON public.trading_signals
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enqueue_target_hit();

-- 3. Trigger for signal outcomes (profit/loss notifications)
CREATE TRIGGER trg_enqueue_signal_outcome_on_insert
    AFTER INSERT ON public.signal_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enqueue_signal_outcome();

-- 4. Trigger for high-impact economic events
CREATE TRIGGER trg_enqueue_market_update_on_insert
    AFTER INSERT ON public.economic_events
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enqueue_market_update();

-- 5. Trigger to process push notification jobs
CREATE TRIGGER trg_notify_process_push_jobs_on_insert
    AFTER INSERT ON public.push_notification_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_notify_process_push_jobs();

-- 6. Triggers for market data updates (signal performance and outcome checking)
CREATE TRIGGER trg_update_signal_performance
    AFTER UPDATE OF current_price, fastforex_price ON public.centralized_market_state
    FOR EACH ROW
    EXECUTE FUNCTION public.update_signal_performance_from_market();

CREATE TRIGGER trg_check_signal_outcomes
    AFTER UPDATE OF current_price, fastforex_price ON public.centralized_market_state
    FOR EACH ROW
    EXECUTE FUNCTION public.check_signal_outcomes();