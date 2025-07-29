
// Dynamic Risk Management System
import { getPipValue, isJPYPair } from './pipCalculator';

export interface RiskManagementConfig {
  maxRiskPerTrade: number; // Percentage of account
  maxDrawdown: number; // Maximum allowed drawdown
  correlationLimit: number; // Maximum correlation between signals
  volatilityMultiplier: number; // ATR multiplier for stops
  adaptiveRiskEnabled: boolean;
}

export interface DynamicStopLoss {
  price: number;
  atrMultiplier: number;
  minPips: number;
  trailingEnabled: boolean;
}

export interface AdaptiveTakeProfit {
  levels: number[];
  ratios: number[];
  volatilityAdjusted: boolean;
}

export interface PositionSizing {
  recommendedLotSize: number;
  maxLotSize: number;
  riskAmount: number;
  riskRewardRatio: number;
}

export interface CorrelationFilter {
  isCorrelated: boolean;
  correlationScore: number;
  conflictingPairs: string[];
}

// Default risk management configuration
export const DEFAULT_RISK_CONFIG: RiskManagementConfig = {
  maxRiskPerTrade: 0.75, // Reduced from 1% to 0.75% per trade
  maxDrawdown: 8.0, // Reduced from 10% to 8% maximum drawdown
  correlationLimit: 0.6, // Reduced from 70% to 60% correlation limit
  volatilityMultiplier: 3.0, // Increased from 2.5x to 3.0x ATR for wider stops
  adaptiveRiskEnabled: true
};

// Calculate dynamic stop loss based on ATR and market conditions
export const calculateDynamicStopLoss = (
  entryPrice: number,
  symbol: string,
  signalType: 'BUY' | 'SELL',
  atrValue: number,
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme',
  config: RiskManagementConfig = DEFAULT_RISK_CONFIG
): DynamicStopLoss => {
  const pipValue = getPipValue(symbol);
  
  // Adjust ATR multiplier based on volatility
  let adjustedMultiplier = config.volatilityMultiplier;
  
  switch (volatilityProfile) {
    case 'low':
      adjustedMultiplier = Math.max(2.0, config.volatilityMultiplier - 0.5);
      break;
    case 'normal':
      adjustedMultiplier = config.volatilityMultiplier;
      break;
    case 'high':
      adjustedMultiplier = config.volatilityMultiplier + 0.5;
      break;
    case 'extreme':
      adjustedMultiplier = config.volatilityMultiplier + 1.0;
      break;
  }
  
  const atrDistance = atrValue * adjustedMultiplier;
  
  // Minimum stop loss distances (much stricter than before)
  const minimumPips = isJPYPair(symbol) ? 45 : 50; // Increased from 35/40 to 45/50
  const minimumDistance = minimumPips * pipValue;
  
  const stopDistance = Math.max(atrDistance, minimumDistance);
  
  const stopPrice = signalType === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
  
  return {
    price: stopPrice,
    atrMultiplier: adjustedMultiplier,
    minPips: minimumPips,
    trailingEnabled: volatilityProfile !== 'extreme'
  };
};

// Calculate adaptive take profit levels based on volatility and risk-reward
export const calculateAdaptiveTakeProfit = (
  entryPrice: number,
  stopLoss: number,
  symbol: string,
  signalType: 'BUY' | 'SELL',
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme',
  atrValue: number
): AdaptiveTakeProfit => {
  const pipValue = getPipValue(symbol);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  
  // Base risk-reward ratios adjusted for volatility
  let baseRatios: number[];
  
  switch (volatilityProfile) {
    case 'low':
      baseRatios = [2.5, 3.5, 4.5, 5.5, 7.0]; // Increased minimum R:R from 1.5 to 2.5
      break;
    case 'normal':
      baseRatios = [2.5, 3.5, 4.8, 6.0, 8.0]; // Increased minimum R:R from 1.8 to 2.5
      break;
    case 'high':
      baseRatios = [2.5, 3.8, 5.2, 7.0, 9.0]; // Increased minimum R:R from 2.0 to 2.5
      break;
    case 'extreme':
      baseRatios = [2.5, 3.0, 4.0, 5.0, 6.0]; // Increased minimum R:R from 1.2 to 2.5
      break;
    default:
      baseRatios = [2.5, 3.5, 4.8, 6.0, 8.0];
  }
  
  // Calculate take profit levels
  const takeProfitLevels = baseRatios.map(ratio => {
    const targetDistance = stopDistance * ratio;
    return signalType === 'BUY' 
      ? entryPrice + targetDistance 
      : entryPrice - targetDistance;
  });
  
  // Ensure minimum pip requirements for each level (increased)
  const minimumTakeProfitPips = isJPYPair(symbol) ? 30 : 35; // Increased from 20/25 to 30/35
  const minimumDistance = minimumTakeProfitPips * pipValue;
  
  const adjustedLevels = takeProfitLevels.map(level => {
    const distance = Math.abs(level - entryPrice);
    if (distance < minimumDistance) {
      return signalType === 'BUY' 
        ? entryPrice + minimumDistance 
        : entryPrice - minimumDistance;
    }
    return level;
  });
  
  return {
    levels: adjustedLevels,
    ratios: baseRatios,
    volatilityAdjusted: true
  };
};

// Calculate position sizing based on risk management rules
export const calculatePositionSizing = (
  entryPrice: number,
  stopLoss: number,
  accountBalance: number,
  symbol: string,
  config: RiskManagementConfig = DEFAULT_RISK_CONFIG
): PositionSizing => {
  const pipValue = getPipValue(symbol);
  const stopLossPips = Math.abs(entryPrice - stopLoss) / pipValue;
  
  // Calculate risk amount
  const riskAmount = (accountBalance * config.maxRiskPerTrade) / 100;
  
  // Calculate lot size based on risk
  const pipValuePerLot = isJPYPair(symbol) ? 1000 : 10; // Standard lot pip values
  const recommendedLotSize = riskAmount / (stopLossPips * pipValuePerLot);
  
  // Apply maximum lot size limits
  const maxLotSize = Math.min(recommendedLotSize, accountBalance * 0.1 / (entryPrice * 100000));
  
  // Calculate risk-reward ratio (assuming first take profit level)
  const firstTakeProfit = entryPrice + (Math.abs(entryPrice - stopLoss) * 2); // 2:1 ratio
  const rewardDistance = Math.abs(firstTakeProfit - entryPrice);
  const riskDistance = Math.abs(entryPrice - stopLoss);
  const riskRewardRatio = rewardDistance / riskDistance;
  
  return {
    recommendedLotSize: Math.max(0.01, Math.min(recommendedLotSize, maxLotSize)),
    maxLotSize,
    riskAmount,
    riskRewardRatio
  };
};

// Currency pair correlation matrix (simplified)
const CORRELATION_MATRIX: { [key: string]: { [key: string]: number } } = {
  'EURUSD': { 'GBPUSD': 0.75, 'AUDUSD': 0.65, 'USDCHF': -0.85, 'USDJPY': -0.45 },
  'GBPUSD': { 'EURUSD': 0.75, 'AUDUSD': 0.60, 'USDCHF': -0.70, 'EURJPY': 0.55 },
  'AUDUSD': { 'EURUSD': 0.65, 'GBPUSD': 0.60, 'NZDUSD': 0.85, 'USDCHF': -0.55 },
  'USDCHF': { 'EURUSD': -0.85, 'GBPUSD': -0.70, 'USDJPY': 0.35, 'AUDUSD': -0.55 },
  'USDJPY': { 'EURUSD': -0.45, 'GBPJPY': 0.40, 'USDCHF': 0.35, 'EURJPY': 0.60 },
  'NZDUSD': { 'AUDUSD': 0.85, 'EURNZD': -0.60, 'GBPNZD': -0.65, 'AUDNZD': 0.70 }
};

// Check for correlation conflicts
export const checkCorrelationConflicts = (
  newSignal: { symbol: string; type: 'BUY' | 'SELL' },
  existingSignals: Array<{ symbol: string; type: 'BUY' | 'SELL' }>,
  config: RiskManagementConfig = DEFAULT_RISK_CONFIG
): CorrelationFilter => {
  const conflictingPairs: string[] = [];
  let maxCorrelation = 0;
  
  for (const existingSignal of existingSignals) {
    const correlation = CORRELATION_MATRIX[newSignal.symbol]?.[existingSignal.symbol] || 0;
    const absCorrelation = Math.abs(correlation);
    
    if (absCorrelation > config.correlationLimit) {
      // Check if signals are in same direction (higher risk)
      const sameDirection = newSignal.type === existingSignal.type;
      const oppositeCorrelation = correlation < 0;
      
      // Risk scenarios:
      // 1. Same direction + positive correlation = double exposure
      // 2. Opposite direction + negative correlation = double exposure
      if ((sameDirection && correlation > 0) || (!sameDirection && correlation < 0)) {
        conflictingPairs.push(existingSignal.symbol);
        maxCorrelation = Math.max(maxCorrelation, absCorrelation);
      }
    }
  }
  
  return {
    isCorrelated: conflictingPairs.length > 0,
    correlationScore: maxCorrelation,
    conflictingPairs
  };
};

// Calculate drawdown protection
export const calculateDrawdownProtection = (
  currentDrawdown: number,
  config: RiskManagementConfig = DEFAULT_RISK_CONFIG
): { shouldReduceRisk: boolean; riskReduction: number; tradingHalted: boolean } => {
  const drawdownPercentage = (currentDrawdown / 100) * 100; // Convert to percentage
  
  let shouldReduceRisk = false;
  let riskReduction = 0;
  let tradingHalted = false;
  
  if (drawdownPercentage >= config.maxDrawdown * 0.5) {
    shouldReduceRisk = true;
    riskReduction = 0.5; // Reduce risk by 50%
  }
  
  if (drawdownPercentage >= config.maxDrawdown * 0.75) {
    shouldReduceRisk = true;
    riskReduction = 0.75; // Reduce risk by 75%
  }
  
  if (drawdownPercentage >= config.maxDrawdown) {
    tradingHalted = true;
  }
  
  return { shouldReduceRisk, riskReduction, tradingHalted };
};

// Comprehensive risk assessment
export const assessComprehensiveRisk = (
  signal: {
    symbol: string;
    type: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    atr: number;
    volatilityProfile: 'low' | 'normal' | 'high' | 'extreme';
  },
  existingSignals: Array<{ symbol: string; type: 'BUY' | 'SELL' }>,
  accountBalance: number,
  currentDrawdown: number = 0,
  config: RiskManagementConfig = DEFAULT_RISK_CONFIG
): {
  isApproved: boolean;
  riskScore: number;
  riskFactors: string[];
  adjustedStopLoss: DynamicStopLoss;
  takeProfitLevels: AdaptiveTakeProfit;
  positionSize: PositionSizing;
  correlationFilter: CorrelationFilter;
} => {
  const riskFactors: string[] = [];
  let riskScore = 0;
  
  // 1. Correlation check
  const correlationFilter = checkCorrelationConflicts(signal, existingSignals, config);
  if (correlationFilter.isCorrelated) {
    riskScore += correlationFilter.correlationScore * 30;
    riskFactors.push(`High correlation with ${correlationFilter.conflictingPairs.join(', ')}`);
  }
  
  // 2. Volatility assessment
  if (signal.volatilityProfile === 'extreme') {
    riskScore += 25;
    riskFactors.push('Extreme market volatility detected');
  } else if (signal.volatilityProfile === 'high') {
    riskScore += 15;
    riskFactors.push('High market volatility');
  }
  
  // 3. Drawdown protection
  const drawdownProtection = calculateDrawdownProtection(currentDrawdown, config);
  if (drawdownProtection.tradingHalted) {
    riskScore += 100;
    riskFactors.push('Maximum drawdown reached - trading halted');
  } else if (drawdownProtection.shouldReduceRisk) {
    riskScore += 20;
    riskFactors.push(`Drawdown protection active - risk reduced by ${drawdownProtection.riskReduction * 100}%`);
  }
  
  // 4. Calculate risk components
  const adjustedStopLoss = calculateDynamicStopLoss(
    signal.entryPrice,
    signal.symbol,
    signal.type,
    signal.atr,
    signal.volatilityProfile,
    config
  );
  
  const takeProfitLevels = calculateAdaptiveTakeProfit(
    signal.entryPrice,
    adjustedStopLoss.price,
    signal.symbol,
    signal.type,
    signal.volatilityProfile,
    signal.atr
  );
  
  const positionSize = calculatePositionSizing(
    signal.entryPrice,
    adjustedStopLoss.price,
    accountBalance,
    signal.symbol,
    config
  );
  
  // 5. Risk-reward validation (increased minimum)
  if (positionSize.riskRewardRatio < 2.5) {
    riskScore += 25;
    riskFactors.push('Risk-reward ratio below 2.5:1 minimum');
  }
  
  // 6. Position sizing validation
  if (positionSize.recommendedLotSize > positionSize.maxLotSize) {
    riskScore += 15;
    riskFactors.push('Position size exceeds maximum allowed');
  }
  
  // Final approval decision (more conservative threshold)
  const isApproved = riskScore < 35 && !drawdownProtection.tradingHalted; // Reduced from 50 to 35
  
  return {
    isApproved,
    riskScore,
    riskFactors,
    adjustedStopLoss,
    takeProfitLevels,
    positionSize,
    correlationFilter
  };
};
