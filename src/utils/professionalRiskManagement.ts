// Professional Risk Management Suite for Forex Trading
// Implements institutional-grade risk assessment and position sizing

import { calculateImprovedStopLoss, calculateFixedPipTakeProfit, calculateStopLossPips, calculateTakeProfitPips, calculateRiskRewardRatio, isJPYPair } from './pipCalculator';

export interface ProfessionalRiskConfig {
  // Position sizing parameters
  maxRiskPerTradePercent: number; // 1-2% recommended
  maxAccountDrawdownPercent: number; // 10-20% maximum
  maxCorrelatedPositions: number; // 2-3 maximum
  
  // Stop loss parameters
  atrMultiplier: number; // 2.5x ATR recommended
  minimumStopLossPips: number; // 40 pips minimum
  maximumStopLossPips: number; // 150 pips maximum
  
  // Take profit parameters
  minimumTakeProfitPips: number; // 25 pips minimum
  minimumRiskRewardRatio: number; // 1.5:1 minimum
  preferredRiskRewardRatio: number; // 2:1 preferred
  
  // Market condition filters
  maxVolatilityThreshold: number; // Skip if ATR > threshold
  minTrendStrength: number; // 0.005 minimum trend strength
  newsImpactHours: number; // 2 hours around major news
  
  // Session preferences
  preferredSessions: string[]; // ['European', 'American']
  avoidSessions: string[]; // ['Asian'] for lower volatility pairs
}

export const DEFAULT_PROFESSIONAL_RISK_CONFIG: ProfessionalRiskConfig = {
  maxRiskPerTradePercent: 2.0,
  maxAccountDrawdownPercent: 15.0,
  maxCorrelatedPositions: 2,
  atrMultiplier: 2.5,
  minimumStopLossPips: 40,
  maximumStopLossPips: 120,
  minimumTakeProfitPips: 25,
  minimumRiskRewardRatio: 1.5,
  preferredRiskRewardRatio: 2.0,
  maxVolatilityThreshold: 0.025,
  minTrendStrength: 0.005,
  newsImpactHours: 2,
  preferredSessions: ['European', 'American'],
  avoidSessions: []
};

export interface ProfessionalPositionSize {
  recommendedLotSize: number;
  maximumLotSize: number;
  positionValue: number;
  riskAmount: number;
  maxDrawdownRisk: number;
  confidenceAdjustedSize: number;
}

export interface ProfessionalStopLoss {
  dynamicPrice: number;
  staticPrice: number;
  atrBasedPrice: number;
  pips: number;
  atrMultiplier: number;
  trailingStopEnabled: boolean;
}

export interface ProfessionalTakeProfit {
  levels: number[];
  pips: number[];
  riskRewardRatios: number[];
  fibonacciTargets: number[];
  pivotTargets: number[];
}

export interface CorrelationRisk {
  correlatedPairs: string[];
  correlationCoefficients: number[];
  hasConflict: boolean;
  maxAllowedPositions: number;
  riskMultiplier: number;
}

export interface SessionAnalysis {
  currentSession: 'Asian' | 'European' | 'American' | 'Overlap';
  sessionVolatility: 'low' | 'normal' | 'high' | 'extreme';
  optimalEntryTime: boolean;
  volumeProfile: number;
  recommendedPairs: string[];
  avoidPairs: string[];
}

export interface ProfessionalRiskAssessment {
  positionSize: ProfessionalPositionSize;
  stopLoss: ProfessionalStopLoss;
  takeProfit: ProfessionalTakeProfit;
  correlationRisk: CorrelationRisk;
  sessionAnalysis: SessionAnalysis;
  marketConditions: {
    volatilityProfile: 'low' | 'normal' | 'high' | 'extreme';
    trendStrength: number;
    economicEventsNearby: boolean;
    newsSentimentScore: number;
  };
  overallRiskScore: number; // 0-100, lower is safer
  riskGrade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'HIGH' | 'EXCESSIVE';
  tradingApproval: boolean;
  riskFactors: string[];
}

// Calculate professional dynamic stop loss
export const calculateProfessionalStopLoss = (
  entryPrice: number,
  symbol: string,
  signalType: 'BUY' | 'SELL',
  atrValue: number,
  config: ProfessionalRiskConfig = DEFAULT_PROFESSIONAL_RISK_CONFIG
): ProfessionalStopLoss => {
  // ATR-based dynamic stop loss
  const atrBasedPrice = calculateImprovedStopLoss(entryPrice, symbol, signalType, atrValue, config.atrMultiplier);
  
  // Static minimum distance stop loss
  const staticPrice = calculateImprovedStopLoss(entryPrice, symbol, signalType, atrValue, 1.0); // 1x ATR minimum
  
  // Choose the more conservative (wider) stop loss
  const dynamicPrice = signalType === 'BUY' 
    ? Math.min(atrBasedPrice, staticPrice)
    : Math.max(atrBasedPrice, staticPrice);
  
  const pips = calculateStopLossPips(entryPrice, dynamicPrice, symbol);
  
  // Ensure pips are within professional limits
  const adjustedPips = Math.max(config.minimumStopLossPips, Math.min(pips, config.maximumStopLossPips));
  const adjustedPrice = calculateImprovedStopLoss(entryPrice, symbol, signalType, atrValue, adjustedPips / pips * config.atrMultiplier);
  
  return {
    dynamicPrice: adjustedPrice,
    staticPrice,
    atrBasedPrice,
    pips: adjustedPips,
    atrMultiplier: config.atrMultiplier,
    trailingStopEnabled: pips >= 60 // Enable trailing for larger stops
  };
};

// Calculate professional tiered take profits
export const calculateProfessionalTakeProfit = (
  entryPrice: number,
  stopLoss: number,
  symbol: string,
  signalType: 'BUY' | 'SELL',
  fibonacciLevels: number[] = [],
  pivotLevels: number[] = [],
  config: ProfessionalRiskConfig = DEFAULT_PROFESSIONAL_RISK_CONFIG
): ProfessionalTakeProfit => {
  const stopLossPips = calculateStopLossPips(entryPrice, stopLoss, symbol);
  
  // Calculate risk-reward based targets
  const rrTargets = [
    config.minimumRiskRewardRatio,
    config.preferredRiskRewardRatio,
    config.preferredRiskRewardRatio * 1.5,
    config.preferredRiskRewardRatio * 2.0,
    config.preferredRiskRewardRatio * 2.5
  ];
  
  const levels: number[] = [];
  const pips: number[] = [];
  const riskRewardRatios: number[] = [];
  
  rrTargets.forEach(ratio => {
    const targetPips = Math.max(stopLossPips * ratio, config.minimumTakeProfitPips);
    const targetPrice = calculateFixedPipTakeProfit(entryPrice, signalType, targetPips, symbol);
    
    levels.push(targetPrice);
    pips.push(targetPips);
    riskRewardRatios.push(ratio);
  });
  
  // Filter fibonacci and pivot targets that make sense
  const fibonacciTargets = fibonacciLevels.filter(level => {
    const distance = Math.abs(level - entryPrice);
    const requiredDistance = Math.abs(entryPrice - stopLoss) * config.minimumRiskRewardRatio;
    return distance >= requiredDistance;
  }).slice(0, 3); // Top 3 Fibonacci targets
  
  const pivotTargets = pivotLevels.filter(level => {
    const distance = Math.abs(level - entryPrice);
    const requiredDistance = Math.abs(entryPrice - stopLoss) * config.minimumRiskRewardRatio;
    return distance >= requiredDistance;
  }).slice(0, 2); // Top 2 pivot targets
  
  return {
    levels: levels.slice(0, 5), // Top 5 targets
    pips: pips.slice(0, 5),
    riskRewardRatios: riskRewardRatios.slice(0, 5),
    fibonacciTargets,
    pivotTargets
  };
};

// Calculate professional position sizing
export const calculateProfessionalPositionSize = (
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number,
  symbol: string,
  confidenceLevel: number, // 0-100
  config: ProfessionalRiskConfig = DEFAULT_PROFESSIONAL_RISK_CONFIG
): ProfessionalPositionSize => {
  const riskAmount = (accountBalance * Math.min(riskPercentage, config.maxRiskPerTradePercent)) / 100;
  const stopLossPips = calculateStopLossPips(entryPrice, stopLoss, symbol);
  
  // Standard lot pip values (assuming USD account)
  const pipValuePerLot = isJPYPair(symbol) ? 1000 : 10; // $10 per pip for standard lot
  
  // Base position size calculation
  const baseLotSize = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0;
  
  // Confidence adjustment (reduce size for lower confidence)
  const confidenceMultiplier = Math.max(0.3, confidenceLevel / 100); // 30% minimum, 100% maximum
  const confidenceAdjustedSize = baseLotSize * confidenceMultiplier;
  
  // Account drawdown protection
  const maxDrawdownRisk = (accountBalance * config.maxAccountDrawdownPercent) / 100;
  const drawdownAdjustedSize = Math.min(confidenceAdjustedSize, maxDrawdownRisk / (stopLossPips * pipValuePerLot));
  
  // Final position size constraints
  const recommendedLotSize = Math.max(0.01, Math.min(drawdownAdjustedSize, 2.0)); // Min 0.01, Max 2.0 lots
  const maximumLotSize = Math.min(baseLotSize, 5.0); // Maximum 5 lots regardless of risk
  
  const positionValue = recommendedLotSize * 100000 * entryPrice; // Assuming standard lots
  const maxDrawdownRiskAmount = stopLossPips * pipValuePerLot * recommendedLotSize;
  
  return {
    recommendedLotSize,
    maximumLotSize,
    positionValue,
    riskAmount,
    maxDrawdownRisk: maxDrawdownRiskAmount,
    confidenceAdjustedSize
  };
};

// Professional correlation analysis
export const assessCorrelationRisk = (
  newSymbol: string,
  newSignalType: 'BUY' | 'SELL',
  existingPositions: Array<{ symbol: string; type: 'BUY' | 'SELL' }>,
  config: ProfessionalRiskConfig = DEFAULT_PROFESSIONAL_RISK_CONFIG
): CorrelationRisk => {
  // Simplified correlation matrix (in production, this would be dynamic)
  const CORRELATION_MATRIX: Record<string, Record<string, number>> = {
    'EURUSD': { 'GBPUSD': 0.75, 'USDCHF': -0.85, 'AUDUSD': 0.60 },
    'GBPUSD': { 'EURUSD': 0.75, 'USDCHF': -0.65, 'AUDUSD': 0.55 },
    'USDCHF': { 'EURUSD': -0.85, 'GBPUSD': -0.65, 'USDJPY': 0.70 },
    'USDJPY': { 'EURJPY': 0.80, 'GBPJPY': 0.75, 'USDCHF': 0.70 },
    'AUDUSD': { 'EURUSD': 0.60, 'GBPUSD': 0.55, 'NZDUSD': 0.85 },
    'NZDUSD': { 'AUDUSD': 0.85, 'AUDJPY': 0.60 },
    'USDCAD': { 'AUDUSD': -0.50, 'CADJPY': 0.80 }
  };
  
  const correlatedPairs: string[] = [];
  const correlationCoefficients: number[] = [];
  let riskMultiplier = 1.0;
  let conflictCount = 0;
  
  existingPositions.forEach(position => {
    const correlation = CORRELATION_MATRIX[newSymbol]?.[position.symbol] || 
                      CORRELATION_MATRIX[position.symbol]?.[newSymbol] || 0;
    
    if (Math.abs(correlation) > 0.5) { // Significant correlation
      correlatedPairs.push(position.symbol);
      correlationCoefficients.push(correlation);
      
      // Check for directional conflict
      const sameDirection = (correlation > 0 && newSignalType === position.type) ||
                           (correlation < 0 && newSignalType !== position.type);
      
      if (!sameDirection) {
        conflictCount++;
        riskMultiplier *= 1.5; // Increase risk multiplier for conflicts
      } else {
        riskMultiplier *= (1 + Math.abs(correlation) * 0.5); // Increase risk for high correlation
      }
    }
  });
  
  const hasConflict = conflictCount > 0 || correlatedPairs.length >= config.maxCorrelatedPositions;
  
  return {
    correlatedPairs,
    correlationCoefficients,
    hasConflict,
    maxAllowedPositions: config.maxCorrelatedPositions,
    riskMultiplier: Math.min(riskMultiplier, 3.0) // Cap at 3x risk
  };
};

// Session analysis for optimal timing
export const analyzeCurrentSession = (): SessionAnalysis => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  let currentSession: 'Asian' | 'European' | 'American' | 'Overlap';
  let sessionVolatility: 'low' | 'normal' | 'high' | 'extreme';
  let optimalEntryTime: boolean;
  let volumeProfile: number;
  
  // Session determination based on UTC time
  if (utcHour >= 0 && utcHour < 7) {
    currentSession = 'Asian';
    sessionVolatility = 'low';
    volumeProfile = 0.3;
  } else if (utcHour >= 7 && utcHour < 8) {
    currentSession = 'Overlap'; // Asian-European overlap
    sessionVolatility = 'normal';
    volumeProfile = 0.6;
  } else if (utcHour >= 8 && utcHour < 13) {
    currentSession = 'European';
    sessionVolatility = 'high';
    volumeProfile = 0.9;
  } else if (utcHour >= 13 && utcHour < 17) {
    currentSession = 'Overlap'; // European-American overlap
    sessionVolatility = 'extreme';
    volumeProfile = 1.0;
  } else {
    currentSession = 'American';
    sessionVolatility = 'high';
    volumeProfile = 0.8;
  }
  
  // Optimal entry times (high volume, good volatility)
  optimalEntryTime = (utcHour >= 8 && utcHour <= 17); // European and American sessions
  
  // Session-specific pair recommendations
  const recommendedPairs: string[] = [];
  const avoidPairs: string[] = [];
  
  switch (currentSession) {
    case 'Asian':
      recommendedPairs.push('USDJPY', 'AUDJPY', 'NZDJPY', 'AUDUSD', 'NZDUSD');
      avoidPairs.push('GBPUSD', 'EURGBP', 'GBPCHF');
      break;
    case 'European':
      recommendedPairs.push('EURUSD', 'GBPUSD', 'EURGBP', 'EURJPY', 'GBPJPY');
      avoidPairs.push('AUDUSD', 'NZDUSD');
      break;
    case 'American':
      recommendedPairs.push('EURUSD', 'GBPUSD', 'USDCAD', 'USDCHF');
      avoidPairs.push('AUDJPY', 'NZDJPY');
      break;
    case 'Overlap':
      recommendedPairs.push('EURUSD', 'GBPUSD', 'USDJPY', 'EURJPY', 'GBPJPY');
      break;
  }
  
  return {
    currentSession,
    sessionVolatility,
    optimalEntryTime,
    volumeProfile,
    recommendedPairs,
    avoidPairs
  };
};

// Comprehensive professional risk assessment
export const assessProfessionalRisk = (
  symbol: string,
  signalType: 'BUY' | 'SELL',
  entryPrice: number,
  accountBalance: number,
  confidenceLevel: number,
  atrValue: number,
  trendStrength: number,
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme',
  fibonacciLevels: number[] = [],
  pivotLevels: number[] = [],
  existingPositions: Array<{ symbol: string; type: 'BUY' | 'SELL' }> = [],
  economicEventsNearby: boolean = false,
  newsSentimentScore: number = 0,
  config: ProfessionalRiskConfig = DEFAULT_PROFESSIONAL_RISK_CONFIG
): ProfessionalRiskAssessment => {
  
  // Calculate stop loss
  const stopLoss = calculateProfessionalStopLoss(entryPrice, symbol, signalType, atrValue, config);
  
  // Calculate take profits
  const takeProfit = calculateProfessionalTakeProfit(
    entryPrice, 
    stopLoss.dynamicPrice, 
    symbol, 
    signalType, 
    fibonacciLevels, 
    pivotLevels, 
    config
  );
  
  // Calculate position size
  const positionSize = calculateProfessionalPositionSize(
    accountBalance,
    config.maxRiskPerTradePercent,
    entryPrice,
    stopLoss.dynamicPrice,
    symbol,
    confidenceLevel,
    config
  );
  
  // Assess correlation risk
  const correlationRisk = assessCorrelationRisk(symbol, signalType, existingPositions, config);
  
  // Analyze session
  const sessionAnalysis = analyzeCurrentSession();
  
  // Market conditions assessment
  const marketConditions = {
    volatilityProfile,
    trendStrength,
    economicEventsNearby,
    newsSentimentScore
  };
  
  // Calculate overall risk score (0-100, lower is better)
  let riskScore = 0;
  const riskFactors: string[] = [];
  
  // Volatility risk (0-25 points)
  switch (volatilityProfile) {
    case 'low':
      riskScore += 5;
      break;
    case 'normal':
      riskScore += 10;
      break;
    case 'high':
      riskScore += 20;
      break;
    case 'extreme':
      riskScore += 25;
      riskFactors.push('Extreme market volatility detected');
      break;
  }
  
  // Trend strength risk (0-20 points)
  if (trendStrength < config.minTrendStrength) {
    riskScore += 20;
    riskFactors.push('Weak trend strength');
  } else if (trendStrength < config.minTrendStrength * 2) {
    riskScore += 10;
    riskFactors.push('Moderate trend strength');
  } else {
    riskScore += 5;
  }
  
  // Correlation risk (0-20 points)
  if (correlationRisk.hasConflict) {
    riskScore += 20;
    riskFactors.push(`High correlation risk with ${correlationRisk.correlatedPairs.length} pairs`);
  } else if (correlationRisk.correlatedPairs.length > 0) {
    riskScore += 10;
    riskFactors.push('Moderate correlation with existing positions');
  }
  
  // Confidence risk (0-15 points)
  if (confidenceLevel < 50) {
    riskScore += 15;
    riskFactors.push('Low signal confidence');
  } else if (confidenceLevel < 70) {
    riskScore += 10;
    riskFactors.push('Moderate signal confidence');
  } else {
    riskScore += 5;
  }
  
  // Session timing risk (0-10 points)
  if (!sessionAnalysis.optimalEntryTime) {
    riskScore += 10;
    riskFactors.push('Sub-optimal trading session timing');
  } else if (sessionAnalysis.sessionVolatility === 'extreme') {
    riskScore += 5;
    riskFactors.push('High session volatility');
  }
  
  // News/Economic events risk (0-10 points)
  if (economicEventsNearby) {
    riskScore += 10;
    riskFactors.push('Major economic events nearby');
  }
  
  // News sentiment risk (0-10 points)
  if (Math.abs(newsSentimentScore) > 0.7) {
    riskScore += 10;
    riskFactors.push('Strong news sentiment bias');
  } else if (Math.abs(newsSentimentScore) > 0.4) {
    riskScore += 5;
    riskFactors.push('Moderate news sentiment bias');
  }
  
  // Determine risk grade and trading approval
  let riskGrade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'HIGH' | 'EXCESSIVE';
  let tradingApproval: boolean;
  
  if (riskScore <= 30) {
    riskGrade = 'EXCELLENT';
    tradingApproval = true;
  } else if (riskScore <= 50) {
    riskGrade = 'GOOD';
    tradingApproval = true;
  } else if (riskScore <= 70) {
    riskGrade = 'MODERATE';
    tradingApproval = confidenceLevel >= 60; // Require higher confidence for moderate risk
  } else if (riskScore <= 85) {
    riskGrade = 'HIGH';
    tradingApproval = false;
    riskFactors.push('Risk score too high for safe trading');
  } else {
    riskGrade = 'EXCESSIVE';
    tradingApproval = false;
    riskFactors.push('Excessive risk - trading not recommended');
  }
  
  return {
    positionSize,
    stopLoss,
    takeProfit,
    correlationRisk,
    sessionAnalysis,
    marketConditions,
    overallRiskScore: riskScore,
    riskGrade,
    tradingApproval,
    riskFactors
  };
};