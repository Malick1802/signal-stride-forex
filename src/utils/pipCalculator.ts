
export interface PipCalculationResult {
  pips: number;
  percentage: number;
  isProfit: boolean;
  profitLoss: number;
}

export const isJPYPair = (symbol: string): boolean => {
  return symbol.includes('JPY');
};

export const getPipMultiplier = (symbol: string): number => {
  return isJPYPair(symbol) ? 100 : 10000;
};

export const getPipValue = (symbol: string): number => {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
};

export const calculatePips = (
  entryPrice: number,
  currentPrice: number,
  signalType: 'BUY' | 'SELL',
  symbol: string
): number => {
  const multiplier = getPipMultiplier(symbol);
  let pipDifference = 0;

  if (signalType === 'BUY') {
    pipDifference = currentPrice - entryPrice;
  } else {
    pipDifference = entryPrice - currentPrice;
  }

  return Math.round(pipDifference * multiplier);
};

export const calculateSignalPerformance = (
  entryPrice: number,
  currentPrice: number | null,
  signalType: 'BUY' | 'SELL',
  symbol: string
): PipCalculationResult => {
  if (!currentPrice || !entryPrice) {
    return {
      pips: 0,
      percentage: 0,
      isProfit: false,
      profitLoss: 0
    };
  }

  let profitLoss = 0;
  let isProfit = false;

  if (signalType === 'BUY') {
    profitLoss = currentPrice - entryPrice;
    isProfit = currentPrice > entryPrice;
  } else {
    profitLoss = entryPrice - currentPrice;
    isProfit = entryPrice > currentPrice;
  }

  const pips = calculatePips(entryPrice, currentPrice, signalType, symbol);
  const percentage = entryPrice > 0 ? Math.abs(profitLoss / entryPrice) * 100 : 0;
  
  return {
    pips,
    percentage: isProfit ? percentage : -percentage,
    isProfit,
    profitLoss
  };
};

// IMPROVED: Enhanced stop loss calculation with 30 pip minimum
export const calculateImprovedStopLoss = (
  entryPrice: number,
  symbol: string,
  signalType: string,
  atrValue: number,
  volatilityMultiplier: number = 2.2
): number => {
  const pipValue = getPipValue(symbol);
  const atrDistance = atrValue * volatilityMultiplier;
  
  // UPDATED: Minimum stop loss distances (30 pips minimum for all pairs)
  const minimumPips = 30;
  const minimumDistance = minimumPips * pipValue;
  
  const stopDistance = Math.max(atrDistance, minimumDistance);
  
  return signalType === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
};

// UPDATED: Fixed pip-based take profit calculation with 15 pip minimum
export const calculateFixedPipTakeProfit = (
  entryPrice: number,
  signalType: string,
  pipDistance: number,
  symbol: string
): number => {
  const pipValue = getPipValue(symbol);
  
  // UPDATED: Enforce minimum 15 pips for take profit
  const minimumTakeProfitPips = 15;
  const effectivePipDistance = Math.max(pipDistance, minimumTakeProfitPips);
  
  const priceDistance = effectivePipDistance * pipValue;
  
  return signalType === 'BUY' 
    ? entryPrice + priceDistance 
    : entryPrice - priceDistance;
};

export const calculateStopLossPips = (
  entryPrice: number,
  stopLoss: number,
  symbol: string
): number => {
  const multiplier = getPipMultiplier(symbol);
  const pipDifference = Math.abs(entryPrice - stopLoss);
  return Math.round(pipDifference * multiplier);
};

export const calculateTakeProfitPips = (
  entryPrice: number,
  takeProfit: number,
  symbol: string
): number => {
  const multiplier = getPipMultiplier(symbol);
  const pipDifference = Math.abs(takeProfit - entryPrice);
  return Math.round(pipDifference * multiplier);
};
