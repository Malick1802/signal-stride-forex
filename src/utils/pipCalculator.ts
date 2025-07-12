
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

// ENHANCED: Stricter stop loss calculation with 40 pip minimum
export const calculateImprovedStopLoss = (
  entryPrice: number,
  symbol: string,
  signalType: string,
  atrValue: number,
  volatilityMultiplier: number = 2.5 // Increased default
): number => {
  const pipValue = getPipValue(symbol);
  const atrDistance = atrValue * volatilityMultiplier;
  
  // ENHANCED: Stricter minimum stop loss distances (40 pips minimum for all pairs)
  const minimumPips = isJPYPair(symbol) ? 40 : 40; // Unified 40 pip minimum
  const minimumDistance = minimumPips * pipValue;
  
  const stopDistance = Math.max(atrDistance, minimumDistance);
  
  return signalType === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
};

// ENHANCED: Stricter pip-based take profit calculation with 25 pip minimum
export const calculateFixedPipTakeProfit = (
  entryPrice: number,
  signalType: string,
  pipDistance: number,
  symbol: string
): number => {
  const pipValue = getPipValue(symbol);
  
  // ENHANCED: Stricter minimum 25 pips for take profit
  const minimumTakeProfitPips = 25;
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

// ENHANCED: Risk-reward ratio calculation
export const calculateRiskRewardRatio = (
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  symbol: string
): number => {
  const stopLossPips = calculateStopLossPips(entryPrice, stopLoss, symbol);
  const takeProfitPips = calculateTakeProfitPips(entryPrice, takeProfit, symbol);
  
  if (stopLossPips === 0) return 0;
  return takeProfitPips / stopLossPips;
};

// ENHANCED: Position sizing calculation based on risk percentage
export const calculatePositionSize = (
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number,
  symbol: string
): { lotSize: number; riskAmount: number; maxLoss: number } => {
  const riskAmount = (accountBalance * riskPercentage) / 100;
  const stopLossPips = calculateStopLossPips(entryPrice, stopLoss, symbol);
  
  // Standard lot pip values
  const pipValuePerLot = isJPYPair(symbol) ? 1000 : 10; // $10 per pip for standard lot (USD account)
  
  // Calculate lot size
  const lotSize = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0;
  const maxLoss = stopLossPips * pipValuePerLot * lotSize;
  
  return {
    lotSize: Math.max(0.01, Math.min(lotSize, 10)), // Min 0.01, Max 10 lots
    riskAmount,
    maxLoss
  };
};

// ENHANCED: Signal quality assessment based on pip requirements
export const assessSignalQuality = (
  entryPrice: number,
  stopLoss: number,
  takeProfits: number[],
  symbol: string
): {
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  score: number;
  factors: string[];
  meetsMinimumRequirements: boolean;
} => {
  const factors: string[] = [];
  let score = 0;
  
  const stopLossPips = calculateStopLossPips(entryPrice, stopLoss, symbol);
  const firstTPPips = takeProfits.length > 0 ? calculateTakeProfitPips(entryPrice, takeProfits[0], symbol) : 0;
  const rrRatio = firstTPPips > 0 ? firstTPPips / stopLossPips : 0;
  
  // Check minimum requirements
  const meetsStopLoss = stopLossPips >= 40;
  const meetsTakeProfit = firstTPPips >= 25;
  const meetsRR = rrRatio >= 2.0;
  
  const meetsMinimumRequirements = meetsStopLoss && meetsTakeProfit && meetsRR;
  
  // Scoring
  if (meetsStopLoss) {
    score += 25;
    factors.push(`Stop Loss: ${stopLossPips} pips ✓`);
  } else {
    factors.push(`Stop Loss: ${stopLossPips} pips (min 40 required) ✗`);
  }
  
  if (meetsTakeProfit) {
    score += 25;
    factors.push(`Take Profit: ${firstTPPips} pips ✓`);
  } else {
    factors.push(`Take Profit: ${firstTPPips} pips (min 25 required) ✗`);
  }
  
  if (meetsRR) {
    score += 25;
    factors.push(`Risk:Reward: ${rrRatio.toFixed(2)}:1 ✓`);
    
    // Bonus for excellent R:R
    if (rrRatio >= 3.0) {
      score += 15;
      factors.push('Excellent Risk:Reward ratio');
    }
  } else {
    factors.push(`Risk:Reward: ${rrRatio.toFixed(2)}:1 (min 2:1 required) ✗`);
  }
  
  // Multiple take profit levels bonus
  if (takeProfits.length >= 3) {
    score += 10;
    factors.push(`Multiple TPs: ${takeProfits.length} levels`);
  }
  
  // Quality grading
  let quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  if (score >= 85) quality = 'EXCELLENT';
  else if (score >= 70) quality = 'GOOD';
  else if (score >= 50) quality = 'FAIR';
  else quality = 'POOR';
  
  return {
    quality,
    score,
    factors,
    meetsMinimumRequirements
  };
};
