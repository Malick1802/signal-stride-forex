
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

  // Enhanced validation with null checks
  const hasRequiredFields = signal.id && 
                           signal.pair && 
                           signal.type &&
                           signal.entryPrice !== null &&
                           signal.entryPrice !== undefined;
  
  if (!hasRequiredFields) {
    console.error('SignalCard: Invalid signal data after validation:', signal);
    return false;
  }

  // Validate numeric fields
  const entryPrice = parseFloat(signal.entryPrice?.toString() || '0');
  if (isNaN(entryPrice) || entryPrice <= 0) {
    console.error('SignalCard: Invalid entry price:', signal.entryPrice);
    return false;
  }

  return true;
};

export const createSafeSignal = (signal: any): Signal => {
  // Enhanced safe signal creation with null protection
  const safeEntry = signal?.entryPrice?.toString() || '0.00000';
  const safeStopLoss = signal?.stopLoss?.toString() || '0.00000';
  const safeTakeProfit1 = signal?.takeProfit1?.toString() || '0.00000';
  const safeTakeProfit2 = signal?.takeProfit2?.toString() || '0.00000';
  const safeTakeProfit3 = signal?.takeProfit3?.toString() || '0.00000';
  
  return {
    id: signal?.id || 'unknown',
    pair: signal?.pair || 'UNKNOWN',
    type: signal?.type || 'BUY',
    entryPrice: safeEntry,
    stopLoss: safeStopLoss,
    takeProfit1: safeTakeProfit1,
    takeProfit2: safeTakeProfit2,
    takeProfit3: safeTakeProfit3,
    confidence: signal?.confidence || 0,
    timestamp: signal?.timestamp || new Date().toISOString(),
    analysisText: signal?.analysisText || 'No analysis available',
    chartData: Array.isArray(signal?.chartData) ? signal.chartData : []
  };
};

export const safeParseFloat = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseFloat(value.toString());
  return isNaN(parsed) ? defaultValue : parsed;
};

export const safeParseArray = (arrayData: any): number[] => {
  if (!arrayData) return [];
  if (!Array.isArray(arrayData)) return [];
  return arrayData.filter(item => item !== null && item !== undefined && !isNaN(parseFloat(item)))
                 .map(item => parseFloat(item.toString()));
};
