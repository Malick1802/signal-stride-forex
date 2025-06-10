
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

// IMPROVED: Enhanced stop loss calculation with 40 pip minimum
export const calculateImprovedStopLoss = (
  entryPrice: number,
  symbol: string,
  signalType: string,
  atrValue: number,
  volatilityMultiplier: number = 2.2
): number => {
  const pipValue = getPipValue(symbol);
  const atrDistance = atrValue * volatilityMultiplier;
  
  // NEW: Improved minimum stop loss distances (40 pips minimum for non-JPY, 50 for JPY)
  const minimumPips = isJPYPair(symbol) ? 50 : 40;
  const minimumDistance = minimumPips * pipValue;
  
  const stopDistance = Math.max(atrDistance, minimumDistance);
  
  return signalType === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
};

// NEW: Fixed pip-based take profit calculation
export const calculateFixedPipTakeProfit = (
  entryPrice: number,
  signalType: string,
  pipDistance: number,
  symbol: string
): number => {
  const pipValue = getPipValue(symbol);
  const priceDistance = pipDistance * pipValue;
  
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
