
// Enhanced Technical Analysis with Stricter Standards
export interface EnhancedOHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface StrictTechnicalIndicators {
  rsi: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
    strength: number;
    bullishDivergence: boolean;
    bearishDivergence: boolean;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'above' | 'below' | 'within';
    squeeze: boolean;
    bandwidth: number;
  };
  ema50: number;
  ema200: number;
  atr: number;
  momentum: {
    roc: number; // Rate of Change
    stoch: number; // Stochastic
    williamsR: number;
  };
  trendAlignment: {
    isAligned: boolean;
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    multiTimeframeAlignment: boolean;
  };
  marketRegime: 'trending' | 'ranging' | 'volatile';
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme';
}

// STRICT: RSI with proper thresholds and divergence detection
export const calculateStrictRSI = (prices: number[], period: number = 14): { rsi: number; bullishDivergence: boolean; bearishDivergence: boolean } => {
  if (prices.length < period + 1) return { rsi: 50, bullishDivergence: false, bearishDivergence: false };
  
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
  
  if (avgLoss === 0) return { rsi: 100, bullishDivergence: false, bearishDivergence: false };
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Divergence detection (simplified)
  const recentPrices = prices.slice(-5);
  const recentRSI = [rsi]; // In real implementation, calculate RSI for last 5 periods
  
  const bullishDivergence = recentPrices[0] > recentPrices[4] && rsi < 30;
  const bearishDivergence = recentPrices[0] < recentPrices[4] && rsi > 70;
  
  return { rsi, bullishDivergence, bearishDivergence };
};

// STRICT: RSI signal validation with proper thresholds
export const validateStrictRSISignal = (rsi: number, signalType: 'BUY' | 'SELL', hasDivergence: boolean): { isValid: boolean; strength: 'weak' | 'moderate' | 'strong' | 'extreme' } => {
  if (signalType === 'BUY') {
    if (rsi < 20 && hasDivergence) return { isValid: true, strength: 'extreme' };
    if (rsi < 25) return { isValid: true, strength: 'strong' };
    if (rsi < 30) return { isValid: true, strength: 'moderate' };
    return { isValid: false, strength: 'weak' };
  } else {
    if (rsi > 80 && hasDivergence) return { isValid: true, strength: 'extreme' };
    if (rsi > 75) return { isValid: true, strength: 'strong' };
    if (rsi > 70) return { isValid: true, strength: 'moderate' };
    return { isValid: false, strength: 'weak' };
  }
};

// Enhanced MACD with momentum analysis
export const calculateEnhancedMACD = (prices: number[]): { line: number; signal: number; histogram: number; strength: number; bullishDivergence: boolean; bearishDivergence: boolean } => {
  if (prices.length < 26) return { line: 0, signal: 0, histogram: 0, strength: 0, bullishDivergence: false, bearishDivergence: false };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  const macdSignal = calculateEMA([macdLine], 9);
  const histogram = macdLine - macdSignal;
  
  const strength = Math.abs(histogram);
  
  // Simplified divergence detection
  const bullishDivergence = histogram > 0 && macdLine < macdSignal;
  const bearishDivergence = histogram < 0 && macdLine > macdSignal;
  
  return { line: macdLine, signal: macdSignal, histogram, strength, bullishDivergence, bearishDivergence };
};

// STRICT: Enhanced Bollinger Bands with squeeze detection
export const calculateEnhancedBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number; position: 'above' | 'below' | 'within'; squeeze: boolean; bandwidth: number } => {
  if (prices.length < period) {
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return { upper: avg, middle: avg, lower: avg, position: 'within', squeeze: false, bandwidth: 0 };
  }
  
  const recentPrices = prices.slice(-period);
  const middle = recentPrices.reduce((sum, price) => sum + price, 0) / period;
  
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  const upper = middle + (standardDeviation * stdDev);
  const lower = middle - (standardDeviation * stdDev);
  
  const currentPrice = prices[prices.length - 1];
  let position: 'above' | 'below' | 'within' = 'within';
  
  if (currentPrice > upper) position = 'above';
  else if (currentPrice < lower) position = 'below';
  
  const bandwidth = (upper - lower) / middle;
  const squeeze = bandwidth < 0.002; // Squeeze threshold
  
  return { upper, middle, lower, position, squeeze, bandwidth };
};

// Market regime detection
export const detectMarketRegime = (prices: number[], atr: number): 'trending' | 'ranging' | 'volatile' => {
  if (prices.length < 20) return 'ranging';
  
  const recentPrices = prices.slice(-20);
  const highestHigh = Math.max(...recentPrices);
  const lowestLow = Math.min(...recentPrices);
  const priceRange = highestHigh - lowestLow;
  const currentPrice = prices[prices.length - 1];
  
  // Volatility assessment
  const avgPrice = currentPrice;
  const volatilityRatio = atr / avgPrice;
  
  if (volatilityRatio > 0.02) return 'volatile';
  
  // Trend detection using linear regression slope
  const n = recentPrices.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = recentPrices.reduce((sum, price) => sum + price, 0);
  const sumXY = recentPrices.reduce((sum, price, i) => sum + (i * price), 0);
  const sumX2 = recentPrices.reduce((sum, _, i) => sum + (i * i), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const slopeStrength = Math.abs(slope) / avgPrice;
  
  return slopeStrength > 0.001 ? 'trending' : 'ranging';
};

// Volatility profiling
export const assessVolatilityProfile = (atr: number, currentPrice: number): 'low' | 'normal' | 'high' | 'extreme' => {
  const volatilityRatio = atr / currentPrice;
  
  if (volatilityRatio < 0.005) return 'low';
  if (volatilityRatio < 0.015) return 'normal';
  if (volatilityRatio < 0.025) return 'high';
  return 'extreme';
};

// Enhanced momentum indicators
export const calculateMomentumIndicators = (prices: number[]): { roc: number; stoch: number; williamsR: number } => {
  if (prices.length < 14) return { roc: 0, stoch: 50, williamsR: -50 };
  
  // Rate of Change (ROC)
  const roc = ((prices[prices.length - 1] - prices[prices.length - 12]) / prices[prices.length - 12]) * 100;
  
  // Stochastic Oscillator
  const recentPrices = prices.slice(-14);
  const highestHigh = Math.max(...recentPrices);
  const lowestLow = Math.min(...recentPrices);
  const currentPrice = prices[prices.length - 1];
  
  const stoch = lowestLow === highestHigh ? 50 : ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // Williams %R
  const williamsR = lowestLow === highestHigh ? -50 : (((highestHigh - currentPrice) / (highestHigh - lowestLow)) * -100);
  
  return { roc, stoch, williamsR };
};

// EMA calculation (reused from original)
export const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
};

// STRICT: Multi-confirmation trend alignment
export const validateStrictTrendAlignment = (currentPrice: number, ema50: number, ema200: number, signalType: 'BUY' | 'SELL'): { isAligned: boolean; direction: 'bullish' | 'bearish' | 'neutral'; strength: number; confirmations: string[]; multiTimeframeAlignment: boolean } => {
  const confirmations: string[] = [];
  let strength = 0;
  
  // Calculate EMA separation as percentage of current price
  const emaSeparation = Math.abs(ema50 - ema200) / currentPrice;
  
  if (signalType === 'BUY') {
    // STRICT: Require ALL alignments for BUY
    if (currentPrice > ema50) {
      confirmations.push('Price Above EMA50');
      strength += 0.33;
    }
    if (currentPrice > ema200) {
      confirmations.push('Price Above EMA200');
      strength += 0.33;
    }
    if (ema50 > ema200) {
      confirmations.push('EMA50 Above EMA200');
      strength += 0.34;
    }
    
    // STRICT: Require significant EMA separation (0.5% minimum)
    if (emaSeparation > 0.005 && ema50 > ema200) {
      confirmations.push('Strong Bullish EMA Separation');
    }
    
    // STRICT: Require ALL three confirmations
    const isAligned = confirmations.length >= 3;
    const multiTimeframeAlignment = isAligned && emaSeparation > 0.008;
    
    return { 
      isAligned, 
      direction: isAligned ? 'bullish' : 'neutral', 
      strength,
      confirmations,
      multiTimeframeAlignment
    };
    
  } else {
    // STRICT: Require ALL alignments for SELL
    if (currentPrice < ema50) {
      confirmations.push('Price Below EMA50');
      strength += 0.33;
    }
    if (currentPrice < ema200) {
      confirmations.push('Price Below EMA200');
      strength += 0.33;
    }
    if (ema50 < ema200) {
      confirmations.push('EMA50 Below EMA200');
      strength += 0.34;
    }
    
    // STRICT: Require significant EMA separation
    if (emaSeparation > 0.005 && ema50 < ema200) {
      confirmations.push('Strong Bearish EMA Separation');
    }
    
    // STRICT: Require ALL three confirmations
    const isAligned = confirmations.length >= 3;
    const multiTimeframeAlignment = isAligned && emaSeparation > 0.008;
    
    return { 
      isAligned, 
      direction: isAligned ? 'bearish' : 'neutral', 
      strength,
      confirmations,
      multiTimeframeAlignment
    };
  }
};

// STRICT: Enhanced Bollinger Band validation
export const validateStrictBollingerBandSignal = (bands: { upper: number; middle: number; lower: number; position: 'above' | 'below' | 'within'; squeeze: boolean; bandwidth: number }, signalType: 'BUY' | 'SELL'): { isValid: boolean; strength: 'weak' | 'moderate' | 'strong' } => {
  if (signalType === 'BUY') {
    // STRICT: Only accept signals at lower band with no squeeze
    if (bands.position === 'below' && !bands.squeeze && bands.bandwidth > 0.003) {
      return { isValid: true, strength: 'strong' };
    }
    return { isValid: false, strength: 'weak' };
  } else {
    // STRICT: Only accept signals at upper band with no squeeze
    if (bands.position === 'above' && !bands.squeeze && bands.bandwidth > 0.003) {
      return { isValid: true, strength: 'strong' };
    }
    return { isValid: false, strength: 'weak' };
  }
};

// Generate OHLCV from price data (reused)
export const generateOHLCVFromPrices = (priceData: Array<{ timestamp: number; price: number }>): EnhancedOHLCVData[] => {
  if (priceData.length === 0) return [];
  
  const hourlyData: { [key: string]: number[] } = {};
  
  priceData.forEach(point => {
    const hourKey = Math.floor(point.timestamp / (60 * 60 * 1000)) * 60 * 60 * 1000;
    if (!hourlyData[hourKey]) hourlyData[hourKey] = [];
    hourlyData[hourKey].push(point.price);
  });
  
  return Object.entries(hourlyData).map(([timestamp, prices]) => ({
    timestamp: parseInt(timestamp),
    open: prices[0],
    high: Math.max(...prices),
    low: Math.min(...prices),
    close: prices[prices.length - 1],
    volume: prices.length
  })).sort((a, b) => a.timestamp - b.timestamp);
};

// Enhanced ATR calculation (reused)
export const calculateATR = (ohlcvData: EnhancedOHLCVData[], period: number = 14): number => {
  if (ohlcvData.length < 2) return 0;
  
  const trueRanges = ohlcvData.slice(1).map((candle, i) => {
    const prevClose = ohlcvData[i].close;
    const highLow = candle.high - candle.low;
    const highClose = Math.abs(candle.high - prevClose);
    const lowClose = Math.abs(candle.low - prevClose);
    
    return Math.max(highLow, highClose, lowClose);
  });
  
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
};

// STRICT: Comprehensive technical analysis with multiple confirmations
export const calculateStrictTechnicalIndicators = (ohlcvData: EnhancedOHLCVData[], signalType?: 'BUY' | 'SELL'): StrictTechnicalIndicators & { validationScore: number; confirmations: string[]; qualityGrade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' } => {
  const closes = ohlcvData.map(d => d.close);
  const currentPrice = closes[closes.length - 1];
  
  // Calculate all indicators
  const rsiData = calculateStrictRSI(closes);
  const macd = calculateEnhancedMACD(closes);
  const bollingerBands = calculateEnhancedBollingerBands(closes);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const atr = calculateATR(ohlcvData);
  const momentum = calculateMomentumIndicators(closes);
  const marketRegime = detectMarketRegime(closes, atr);
  const volatilityProfile = assessVolatilityProfile(atr, currentPrice);
  
  // STRICT validations with higher requirements
  let validationScore = 0;
  const allConfirmations: string[] = [];
  
  if (signalType) {
    // RSI validation - STRICT thresholds
    const rsiValidation = validateStrictRSISignal(rsiData.rsi, signalType, rsiData.bullishDivergence || rsiData.bearishDivergence);
    if (rsiValidation.isValid) {
      const rsiPoints = rsiValidation.strength === 'extreme' ? 4 : rsiValidation.strength === 'strong' ? 3 : 2;
      validationScore += rsiPoints;
      allConfirmations.push(`RSI ${rsiValidation.strength} ${signalType.toLowerCase()} signal`);
    }
    
    // MACD validation - require strong momentum
    if ((signalType === 'BUY' && macd.line > macd.signal && macd.histogram > 0) ||
        (signalType === 'SELL' && macd.line < macd.signal && macd.histogram < 0)) {
      if (macd.strength > 0.00001) { // Higher threshold
        validationScore += 3;
        allConfirmations.push('Strong MACD confirmation');
      }
    }
    
    // Trend alignment - STRICT requirements
    const trendValidation = validateStrictTrendAlignment(currentPrice, ema50, ema200, signalType);
    if (trendValidation.isAligned) {
      validationScore += trendValidation.multiTimeframeAlignment ? 4 : 2;
      allConfirmations.push(...trendValidation.confirmations);
    }
    
    // Bollinger Band validation - STRICT
    const bbValidation = validateStrictBollingerBandSignal(bollingerBands, signalType);
    if (bbValidation.isValid) {
      validationScore += 3;
      allConfirmations.push(`Bollinger Band ${bbValidation.strength} confirmation`);
    }
    
    // Momentum confirmations
    if (signalType === 'BUY' && momentum.stoch < 30 && momentum.williamsR < -70) {
      validationScore += 2;
      allConfirmations.push('Oversold momentum confirmation');
    } else if (signalType === 'SELL' && momentum.stoch > 70 && momentum.williamsR > -30) {
      validationScore += 2;
      allConfirmations.push('Overbought momentum confirmation');
    }
    
    // Market regime bonus
    if (marketRegime === 'trending' && trendValidation.isAligned) {
      validationScore += 1;
      allConfirmations.push('Trending market alignment');
    }
  }
  
  // Determine trend alignment
  const trendAlignment = {
    isAligned: signalType ? validateStrictTrendAlignment(currentPrice, ema50, ema200, signalType).isAligned : false,
    direction: currentPrice > ema50 && ema50 > ema200 ? 'bullish' as const : 
               currentPrice < ema50 && ema50 < ema200 ? 'bearish' as const : 'neutral' as const,
    strength: Math.abs(ema50 - ema200) / currentPrice,
    multiTimeframeAlignment: signalType ? validateStrictTrendAlignment(currentPrice, ema50, ema200, signalType).multiTimeframeAlignment : false
  };
  
  // STRICT quality grading - much higher thresholds
  let qualityGrade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  if (validationScore >= 12 && allConfirmations.length >= 5) qualityGrade = 'EXCELLENT';
  else if (validationScore >= 8 && allConfirmations.length >= 4) qualityGrade = 'GOOD';
  else if (validationScore >= 5 && allConfirmations.length >= 3) qualityGrade = 'FAIR';
  else qualityGrade = 'POOR';
  
  return {
    rsi: rsiData.rsi,
    macd: {
      line: macd.line,
      signal: macd.signal,
      histogram: macd.histogram,
      strength: macd.strength,
      bullishDivergence: macd.bullishDivergence,
      bearishDivergence: macd.bearishDivergence
    },
    bollingerBands: {
      ...bollingerBands
    },
    ema50,
    ema200,
    atr,
    momentum,
    trendAlignment,
    marketRegime,
    volatilityProfile,
    validationScore,
    confirmations: allConfirmations,
    qualityGrade
  };
};

// STRICT: Signal quality assessment - only accept high-quality signals
export const calculateStrictSignalScore = (indicators: StrictTechnicalIndicators & { validationScore: number; confirmations: string[]; qualityGrade: string }, signalType: 'BUY' | 'SELL'): { score: number; grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; isHighQuality: boolean } => {
  let score = indicators.validationScore;
  
  // Additional strict requirements
  if (indicators.confirmations.length >= 5) score += 3;
  else if (indicators.confirmations.length >= 4) score += 2;
  else if (indicators.confirmations.length >= 3) score += 1;
  
  // Market regime bonus
  if (indicators.marketRegime === 'trending' && indicators.trendAlignment.isAligned) {
    score += 2;
  }
  
  // Volatility penalty for extreme conditions
  if (indicators.volatilityProfile === 'extreme') {
    score -= 2;
  }
  
  // Multi-timeframe alignment bonus
  if (indicators.trendAlignment.multiTimeframeAlignment) {
    score += 2;
  }
  
  const normalizedScore = Math.min(score, 15);
  
  // MUCH STRICTER grading thresholds
  let grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  if (normalizedScore >= 12) grade = 'EXCELLENT';
  else if (normalizedScore >= 9) grade = 'GOOD';
  else if (normalizedScore >= 6) grade = 'FAIR';
  else grade = 'POOR';
  
  // STRICT: Only accept EXCELLENT and GOOD grades with minimum 4 confirmations
  const isHighQuality = (grade === 'EXCELLENT' || grade === 'GOOD') && 
                       indicators.confirmations.length >= 4 &&
                       indicators.trendAlignment.isAligned &&
                       indicators.volatilityProfile !== 'extreme';
  
  return { score: normalizedScore, grade, isHighQuality };
};
