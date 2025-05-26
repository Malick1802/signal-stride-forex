
interface Signal {
  id: string;
  pair: string;
  type: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  confidence: number;
  timestamp: string;
  analysisText?: string;
  chartData: Array<{ time: number; price: number }>;
}

export const validateSignal = (signal: any): signal is Signal => {
  if (!signal || typeof signal !== 'object') {
    console.error('SignalCard: Invalid or null signal provided');
    return false;
  }

  const hasRequiredFields = signal.id && signal.pair && signal.type;
  if (!hasRequiredFields) {
    console.error('SignalCard: Invalid signal data after validation:', signal);
    return false;
  }

  return true;
};

export const createSafeSignal = (signal: any): Signal => {
  return {
    id: signal?.id || 'unknown',
    pair: signal?.pair || 'UNKNOWN',
    type: signal?.type || 'BUY',
    entryPrice: signal?.entryPrice || '0.00000',
    stopLoss: signal?.stopLoss || '0.00000',
    takeProfit1: signal?.takeProfit1 || '0.00000',
    takeProfit2: signal?.takeProfit2 || '0.00000',
    takeProfit3: signal?.takeProfit3 || '0.00000',
    confidence: signal?.confidence || 0,
    timestamp: signal?.timestamp || new Date().toISOString(),
    analysisText: signal?.analysisText || 'No analysis available',
    chartData: signal?.chartData || []
  };
};
