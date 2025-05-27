
import { supabase } from '@/integrations/supabase/client';
import { SignalToMonitor } from '@/types/signalMonitoring';
import { checkSignalOutcome, processSignalOutcome } from './signalOutcomeProcessor';

export const fetchActiveSignals = async (): Promise<SignalToMonitor[]> => {
  const { data: activeSignals, error: signalsError } = await supabase
    .from('trading_signals')
    .select('*')
    .eq('status', 'active')
    .eq('is_centralized', true);

  if (signalsError || !activeSignals?.length) {
    return [];
  }

  // Transform signals for monitoring with proper type casting
  return activeSignals.map(signal => ({
    id: signal.id,
    symbol: signal.symbol,
    type: (signal.type === 'BUY' || signal.type === 'SELL') ? signal.type as 'BUY' | 'SELL' : 'BUY',
    entryPrice: parseFloat(signal.price.toString()),
    stopLoss: parseFloat(signal.stop_loss.toString()),
    takeProfits: signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [],
    status: signal.status
  }));
};

export const fetchCurrentPrices = async (symbols: string[]): Promise<Record<string, number>> => {
  const { data: marketData, error: priceError } = await supabase
    .from('centralized_market_state')
    .select('symbol, current_price')
    .in('symbol', symbols);

  if (priceError || !marketData?.length) {
    return {};
  }

  const currentPrices: Record<string, number> = {};
  marketData.forEach(data => {
    currentPrices[data.symbol] = parseFloat(data.current_price.toString());
  });

  return currentPrices;
};

export const checkSignalOutcomes = async (
  signals: SignalToMonitor[], 
  currentPrices: Record<string, number>,
  showToast: (toast: any) => void
) => {
  for (const signal of signals) {
    if (signal.status !== 'active') continue;
    
    const currentPrice = currentPrices[signal.symbol];
    if (!currentPrice) continue;

    const outcome = checkSignalOutcome(signal, currentPrice);

    if (outcome.hasOutcome) {
      const result = await processSignalOutcome({
        signal,
        currentPrice,
        exitPrice: outcome.exitPrice,
        hitTarget: outcome.hitTarget,
        targetLevel: outcome.targetLevel
      });

      if (result && typeof result === 'object' && result.success) {
        // Show notification
        showToast({
          title: outcome.hitTarget ? "🎯 Target Hit!" : "⛔ Stop Loss Hit",
          description: `${signal.symbol} ${signal.type} signal ${outcome.hitTarget ? `reached Target ${outcome.targetLevel}` : 'hit stop loss'} (${result.pnlPips >= 0 ? '+' : ''}${result.pnlPips} pips)`,
          duration: 5000,
        });
      }
    }
  }
};
