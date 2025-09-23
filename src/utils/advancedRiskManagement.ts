// Phase 4: Advanced Risk Management with Correlation Analysis and Trailing Stops
export interface TrailingStopConfig {
  enabled: boolean;
  activationLevel: number; // Pips in profit before activation
  trailDistance: number; // Distance to trail in pips
  breakEvenLevel: number; // Pips profit before moving to breakeven
}

export interface CorrelationMatrix {
  [symbol: string]: {
    [correlatedSymbol: string]: number;
  };
}

export interface PositionRiskAnalysis {
  totalRisk: number;
  correlationRisk: number;
  diversificationScore: number;
  maxPositions: number;
  recommendedReduction: number;
}

// Comprehensive correlation matrix for major forex pairs
export const FOREX_CORRELATION_MATRIX: CorrelationMatrix = {
  'EURUSD': {
    'GBPUSD': 0.73, 'AUDUSD': 0.67, 'NZDUSD': 0.62, 'USDCHF': -0.87,
    'USDJPY': -0.23, 'USDCAD': -0.45, 'EURGBP': 0.25, 'EURJPY': 0.68,
    'EURCHF': 0.92, 'EURAUD': 0.45, 'EURCAD': 0.58
  },
  'GBPUSD': {
    'EURUSD': 0.73, 'AUDUSD': 0.58, 'NZDUSD': 0.52, 'USDCHF': -0.68,
    'USDJPY': -0.18, 'USDCAD': -0.38, 'EURGBP': -0.42, 'GBPJPY': 0.65,
    'GBPCHF': 0.85, 'GBPAUD': 0.42, 'GBPCAD': 0.55
  },
  'AUDUSD': {
    'EURUSD': 0.67, 'GBPUSD': 0.58, 'NZDUSD': 0.88, 'USDCHF': -0.58,
    'USDJPY': -0.15, 'USDCAD': -0.48, 'AUDNZD': 0.35, 'AUDJPY': 0.72,
    'AUDCHF': 0.65, 'EURAUD': -0.62, 'AUDCAD': 0.68
  },
  'NZDUSD': {
    'EURUSD': 0.62, 'GBPUSD': 0.52, 'AUDUSD': 0.88, 'USDCHF': -0.55,
    'USDJPY': -0.12, 'USDCAD': -0.45, 'AUDNZD': -0.35, 'NZDJPY': 0.68,
    'NZDCHF': 0.62, 'EURNZD': -0.58, 'NZDCAD': 0.65
  },
  'USDCHF': {
    'EURUSD': -0.87, 'GBPUSD': -0.68, 'AUDUSD': -0.58, 'NZDUSD': -0.55,
    'USDJPY': 0.28, 'USDCAD': 0.35, 'EURCHF': -0.68, 'GBPCHF': -0.45,
    'AUDCHF': -0.38, 'CHFJPY': 0.42, 'CADCHF': 0.32
  },
  'USDJPY': {
    'EURUSD': -0.23, 'GBPUSD': -0.18, 'AUDUSD': -0.15, 'NZDUSD': -0.12,
    'USDCHF': 0.28, 'USDCAD': 0.25, 'EURJPY': 0.85, 'GBPJPY': 0.88,
    'AUDJPY': 0.82, 'NZDJPY': 0.78, 'CADJPY': 0.75, 'CHFJPY': 0.65
  },
  'USDCAD': {
    'EURUSD': -0.45, 'GBPUSD': -0.38, 'AUDUSD': -0.48, 'NZDUSD': -0.45,
    'USDCHF': 0.35, 'USDJPY': 0.25, 'EURCAD': 0.52, 'GBPCAD': 0.48,
    'AUDCAD': 0.45, 'NZDCAD': 0.42, 'CADJPY': 0.35, 'CADCHF': 0.28
  }
};

// Calculate portfolio correlation risk
export const calculatePortfolioCorrelationRisk = (
  newSignal: { symbol: string; type: 'BUY' | 'SELL'; positionSize: number },
  existingPositions: Array<{ symbol: string; type: 'BUY' | 'SELL'; positionSize: number }>,
  correlationMatrix: CorrelationMatrix = FOREX_CORRELATION_MATRIX
): PositionRiskAnalysis => {
  let totalCorrelationRisk = 0;
  let maxCorrelation = 0;
  const correlatedPairs: string[] = [];
  
  for (const position of existingPositions) {
    const correlation = correlationMatrix[newSignal.symbol]?.[position.symbol] || 0;
    const absCorrelation = Math.abs(correlation);
    
    if (absCorrelation > 0.6) { // High correlation threshold
      // Calculate correlation risk based on position sizes and correlation strength
      const sameDirection = newSignal.type === position.type;
      const effectiveCorrelation = sameDirection ? 
        (correlation > 0 ? absCorrelation : 0) : 
        (correlation < 0 ? absCorrelation : 0);
      
      if (effectiveCorrelation > 0.6) {
        const riskMultiplier = (newSignal.positionSize + position.positionSize) * effectiveCorrelation;
        totalCorrelationRisk += riskMultiplier;
        maxCorrelation = Math.max(maxCorrelation, effectiveCorrelation);
        correlatedPairs.push(position.symbol);
      }
    }
  }
  
  // Calculate diversification score (lower correlation = better diversification)
  const avgCorrelation = existingPositions.length > 0 ? 
    totalCorrelationRisk / existingPositions.length : 0;
  const diversificationScore = Math.max(0, 100 - (avgCorrelation * 100));
  
  // Determine maximum positions based on correlation
  const maxPositions = diversificationScore > 80 ? 8 : 
                      diversificationScore > 60 ? 6 : 
                      diversificationScore > 40 ? 4 : 3;
  
  // Recommend position size reduction if high correlation
  const recommendedReduction = maxCorrelation > 0.8 ? 0.5 : 
                              maxCorrelation > 0.7 ? 0.3 : 
                              maxCorrelation > 0.6 ? 0.2 : 0;
  
  return {
    totalRisk: totalCorrelationRisk,
    correlationRisk: maxCorrelation,
    diversificationScore,
    maxPositions,
    recommendedReduction
  };
};

// Dynamic trailing stop configuration based on market conditions
export const calculateTrailingStopConfig = (
  symbol: string,
  atr: number,
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme',
  marketRegime: 'trending' | 'ranging' | 'volatile' | 'breakout'
): TrailingStopConfig => {
  const pipSize = symbol.includes('JPY') ? 0.01 : 0.0001;
  const atrInPips = atr / pipSize;
  
  let config: TrailingStopConfig;
  
  // Base configuration by market regime
  switch (marketRegime) {
    case 'trending':
      config = {
        enabled: true,
        activationLevel: Math.max(20, atrInPips * 1.5),
        trailDistance: Math.max(15, atrInPips * 1.0),
        breakEvenLevel: Math.max(10, atrInPips * 0.5)
      };
      break;
      
    case 'breakout':
      config = {
        enabled: true,
        activationLevel: Math.max(25, atrInPips * 2.0),
        trailDistance: Math.max(20, atrInPips * 1.5),
        breakEvenLevel: Math.max(15, atrInPips * 0.75)
      };
      break;
      
    case 'ranging':
      config = {
        enabled: false, // Trailing stops not ideal for ranging markets
        activationLevel: Math.max(30, atrInPips * 2.5),
        trailDistance: Math.max(25, atrInPips * 2.0),
        breakEvenLevel: Math.max(20, atrInPips * 1.0)
      };
      break;
      
    case 'volatile':
      config = {
        enabled: false, // Too much noise for trailing stops
        activationLevel: Math.max(40, atrInPips * 3.0),
        trailDistance: Math.max(30, atrInPips * 2.5),
        breakEvenLevel: Math.max(25, atrInPips * 1.5)
      };
      break;
      
    default:
      config = {
        enabled: true,
        activationLevel: 25,
        trailDistance: 20,
        breakEvenLevel: 15
      };
  }
  
  // Adjust for volatility profile
  switch (volatilityProfile) {
    case 'low':
      config.activationLevel *= 0.7;
      config.trailDistance *= 0.7;
      config.breakEvenLevel *= 0.7;
      break;
      
    case 'high':
      config.activationLevel *= 1.3;
      config.trailDistance *= 1.3;
      config.breakEvenLevel *= 1.3;
      break;
      
    case 'extreme':
      config.activationLevel *= 1.6;
      config.trailDistance *= 1.6;
      config.breakEvenLevel *= 1.6;
      config.enabled = false; // Disable in extreme volatility
      break;
  }
  
  return config;
};

// Support and resistance-based stop loss placement
export const calculateSupportResistanceStops = (
  entryPrice: number,
  signalType: 'BUY' | 'SELL',
  supportLevels: number[],
  resistanceLevels: number[],
  atr: number,
  symbol: string
): { dynamicStop: number; srLevel: number | null; confidence: number } => {
  const pipSize = symbol.includes('JPY') ? 0.01 : 0.0001;
  const minStopDistance = 15 * pipSize; // Minimum 15 pips
  const maxStopDistance = atr * 4; // Maximum 4x ATR
  
  let srLevel: number | null = null;
  let dynamicStop: number;
  let confidence = 0.5;
  
  if (signalType === 'BUY') {
    // Find nearest support level below entry
    const validSupports = supportLevels
      .filter(level => level < entryPrice)
      .sort((a, b) => b - a); // Closest first
    
    if (validSupports.length > 0) {
      const nearestSupport = validSupports[0];
      const distanceToSupport = entryPrice - nearestSupport;
      
      // Use support level if distance is reasonable
      if (distanceToSupport >= minStopDistance && distanceToSupport <= maxStopDistance) {
        srLevel = nearestSupport;
        dynamicStop = nearestSupport - (3 * pipSize); // 3 pips below support
        confidence = 0.8;
      } else {
        // Fallback to ATR-based stop
        dynamicStop = entryPrice - Math.max(minStopDistance, atr * 2.5);
        confidence = 0.6;
      }
    } else {
      dynamicStop = entryPrice - Math.max(minStopDistance, atr * 2.5);
      confidence = 0.5;
    }
  } else {
    // Find nearest resistance level above entry
    const validResistances = resistanceLevels
      .filter(level => level > entryPrice)
      .sort((a, b) => a - b); // Closest first
    
    if (validResistances.length > 0) {
      const nearestResistance = validResistances[0];
      const distanceToResistance = nearestResistance - entryPrice;
      
      // Use resistance level if distance is reasonable
      if (distanceToResistance >= minStopDistance && distanceToResistance <= maxStopDistance) {
        srLevel = nearestResistance;
        dynamicStop = nearestResistance + (3 * pipSize); // 3 pips above resistance
        confidence = 0.8;
      } else {
        // Fallback to ATR-based stop
        dynamicStop = entryPrice + Math.max(minStopDistance, atr * 2.5);
        confidence = 0.6;
      }
    } else {
      dynamicStop = entryPrice + Math.max(minStopDistance, atr * 2.5);
      confidence = 0.5;
    }
  }
  
  return { dynamicStop, srLevel, confidence };
};

// Position sizing with correlation adjustment
export const calculateCorrelationAdjustedPositionSize = (
  basePositionSize: number,
  symbol: string,
  existingPositions: Array<{ symbol: string; type: 'BUY' | 'SELL'; size: number }>,
  accountBalance: number,
  maxRiskPerTrade: number = 0.02 // 2% default
): { adjustedSize: number; reductionFactor: number; explanation: string } => {
  const correlationAnalysis = calculatePortfolioCorrelationRisk(
    { symbol, type: 'BUY', positionSize: basePositionSize },
    existingPositions.map(pos => ({ ...pos, positionSize: pos.size }))
  );
  
  let reductionFactor = 1.0;
  let explanation = 'No correlation adjustment needed';
  
  // Apply correlation-based reduction
  if (correlationAnalysis.correlationRisk > 0.8) {
    reductionFactor = 0.4; // Reduce by 60%
    explanation = 'High correlation detected - significant position reduction';
  } else if (correlationAnalysis.correlationRisk > 0.7) {
    reductionFactor = 0.6; // Reduce by 40%
    explanation = 'Moderate correlation detected - position reduction applied';
  } else if (correlationAnalysis.correlationRisk > 0.6) {
    reductionFactor = 0.8; // Reduce by 20%
    explanation = 'Low correlation detected - minor position reduction';
  }
  
  // Apply diversification bonus for good diversification
  if (correlationAnalysis.diversificationScore > 80) {
    reductionFactor = Math.min(1.2, reductionFactor * 1.2); // Increase by up to 20%
    explanation = 'Excellent diversification - position size bonus applied';
  }
  
  // Ensure we don't exceed maximum positions
  if (existingPositions.length >= correlationAnalysis.maxPositions) {
    reductionFactor = 0.3; // Significantly reduce if at position limit
    explanation = 'Maximum positions reached - significant reduction required';
  }
  
  const adjustedSize = basePositionSize * reductionFactor;
  
  // Final safety check - never exceed account risk limits
  const maxAllowedSize = (accountBalance * maxRiskPerTrade) / 100000; // Convert to lots
  const finalSize = Math.min(adjustedSize, maxAllowedSize);
  
  return {
    adjustedSize: Math.max(0.01, finalSize), // Minimum 0.01 lots
    reductionFactor,
    explanation
  };
};

// Comprehensive risk assessment for multiple signals
export const assessMultiSignalRisk = (
  signals: Array<{
    symbol: string;
    type: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    positionSize: number;
  }>,
  accountBalance: number
): {
  totalRisk: number;
  correlationRisk: number;
  diversificationScore: number;
  riskScore: number;
  recommendations: string[];
  approved: boolean;
} => {
  const recommendations: string[] = [];
  let totalRisk = 0;
  let correlationRisk = 0;
  let diversificationScore = 100;
  
  // Calculate individual signal risks
  for (const signal of signals) {
    const signalRisk = (Math.abs(signal.entryPrice - signal.stopLoss) * signal.positionSize) / accountBalance;
    totalRisk += signalRisk;
  }
  
  // Calculate correlation between all signals
  let totalCorrelations = 0;
  let correlationCount = 0;
  
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const correlation = FOREX_CORRELATION_MATRIX[signals[i].symbol]?.[signals[j].symbol] || 0;
      const absCorrelation = Math.abs(correlation);
      
      if (absCorrelation > 0.6) {
        const sameDirection = signals[i].type === signals[j].type;
        const effectiveCorrelation = sameDirection ? 
          (correlation > 0 ? absCorrelation : 0) : 
          (correlation < 0 ? absCorrelation : 0);
        
        totalCorrelations += effectiveCorrelation;
        correlationCount++;
      }
    }
  }
  
  correlationRisk = correlationCount > 0 ? totalCorrelations / correlationCount : 0;
  diversificationScore = Math.max(0, 100 - (correlationRisk * 100));
  
  // Generate recommendations
  if (totalRisk > 0.1) { // More than 10% account risk
    recommendations.push('Total portfolio risk exceeds 10% - reduce position sizes');
  }
  
  if (correlationRisk > 0.7) {
    recommendations.push('High correlation between signals - consider reducing correlated positions');
  }
  
  if (signals.length > 8) {
    recommendations.push('Too many simultaneous positions - consider position limits');
  }
  
  if (diversificationScore < 50) {
    recommendations.push('Poor diversification - spread risk across different currency groups');
  }
  
  // Calculate overall risk score (0-100, lower is better)
  const riskScore = (totalRisk * 500) + (correlationRisk * 30) + ((100 - diversificationScore) * 0.5);
  
  // Approval decision
  const approved = riskScore < 80 && totalRisk < 0.15 && correlationRisk < 0.8;
  
  return {
    totalRisk: totalRisk * 100, // Convert to percentage
    correlationRisk,
    diversificationScore,
    riskScore,
    recommendations,
    approved
  };
};