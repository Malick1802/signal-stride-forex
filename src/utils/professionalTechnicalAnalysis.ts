// Professional Technical Analysis Suite for 3-Tier Forex Signal Generation
// Implements institutional-grade technical analysis with multi-timeframe support

export interface ProfessionalOHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  timeframe: string;
}

export interface ProfessionalTechnicalIndicators {
  // RSI with divergence detection
  rsi: {
    value: number;
    oversoldStrength: 'weak' | 'moderate' | 'strong' | 'extreme';
    overboughtStrength: 'weak' | 'moderate' | 'strong' | 'extreme';
    bullishDivergence: boolean;
    bearishDivergence: boolean;
  };
  
  // Enhanced MACD
  macd: {
    line: number;
    signal: number;
    histogram: number;
    strength: number;
    bullishDivergence: boolean;
    bearishDivergence: boolean;
  };
  
  // Bollinger Bands with squeeze detection
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'above' | 'below' | 'within';
    squeeze: boolean;
    bandwidth: number;
  };
  
  // Moving averages
  movingAverages: {
    ema20: number;
    ema50: number;
    ema200: number;
    sma20: number;
    sma50: number;
    sma200: number;
  };
  
  // Momentum indicators
  momentum: {
    stochastic: number;
    williamsR: number;
    roc12: number; // Rate of Change
  };
  
  // Volatility analysis
  volatility: {
    atr14: number;
    profile: 'low' | 'normal' | 'high' | 'extreme';
  };
  
  // Support/Resistance
  supportResistance: {
    supportLevels: number[];
    resistanceLevels: number[];
  };
  
  // Pattern detection
  patterns: {
    candlestickPattern: string | null;
    chartPattern: string | null;
    patternConfidence: number;
  };
  
  // Fibonacci levels
  fibonacci: {
    retracements: { level: number; price: number }[];
    extensions: { level: number; price: number }[];
  };
  
  // Pivot points
  pivotPoints: {
    pivot: number;
    support1: number;
    support2: number;
    support3: number;
    resistance1: number;
    resistance2: number;
    resistance3: number;
  };
  
  // Market regime
  marketRegime: {
    regime: 'trending' | 'ranging' | 'volatile';
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  };
}

export interface MultiTimeframeAnalysis {
  timeframes: {
    '1M': ProfessionalTechnicalIndicators;
    '5M': ProfessionalTechnicalIndicators;
    '15M': ProfessionalTechnicalIndicators;
    '1H': ProfessionalTechnicalIndicators;
    '4H': ProfessionalTechnicalIndicators;
    'D': ProfessionalTechnicalIndicators;
  };
  alignment: {
    bullishAlignment: number; // 0-6 timeframes aligned bullish
    bearishAlignment: number; // 0-6 timeframes aligned bearish
    overallDirection: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  };
}

// Professional RSI with divergence detection
export const calculateProfessionalRSI = (prices: number[], period: number = 14): {
  value: number;
  oversoldStrength: 'weak' | 'moderate' | 'strong' | 'extreme';
  overboughtStrength: 'weak' | 'moderate' | 'strong' | 'extreme';
  bullishDivergence: boolean;
  bearishDivergence: boolean;
} => {
  if (prices.length < period + 1) {
    return {
      value: 50,
      oversoldStrength: 'weak',
      overboughtStrength: 'weak',
      bullishDivergence: false,
      bearishDivergence: false
    };
  }
  
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
  
  if (avgLoss === 0) {
    return {
      value: 100,
      oversoldStrength: 'weak',
      overboughtStrength: 'extreme',
      bullishDivergence: false,
      bearishDivergence: false
    };
  }
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Professional strength assessment
  let oversoldStrength: 'weak' | 'moderate' | 'strong' | 'extreme' = 'weak';
  let overboughtStrength: 'weak' | 'moderate' | 'strong' | 'extreme' = 'weak';
  
  if (rsi < 15) oversoldStrength = 'extreme';
  else if (rsi < 20) oversoldStrength = 'strong';
  else if (rsi < 30) oversoldStrength = 'moderate';
  
  if (rsi > 85) overboughtStrength = 'extreme';
  else if (rsi > 80) overboughtStrength = 'strong';
  else if (rsi > 70) overboughtStrength = 'moderate';
  
  // Simplified divergence detection (would need more historical data for full implementation)
  const recentPrices = prices.slice(-5);
  const bullishDivergence = recentPrices[0] > recentPrices[4] && rsi < 30;
  const bearishDivergence = recentPrices[0] < recentPrices[4] && rsi > 70;
  
  return {
    value: rsi,
    oversoldStrength,
    overboughtStrength,
    bullishDivergence,
    bearishDivergence
  };
};

// Enhanced MACD with divergence analysis
export const calculateEnhancedMACD = (prices: number[]): {
  line: number;
  signal: number;
  histogram: number;
  strength: number;
  bullishDivergence: boolean;
  bearishDivergence: boolean;
} => {
  if (prices.length < 26) {
    return {
      line: 0,
      signal: 0,
      histogram: 0,
      strength: 0,
      bullishDivergence: false,
      bearishDivergence: false
    };
  }
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // For simplification, using current value as signal (would need historical MACD values)
  const macdSignal = calculateEMA([macdLine], 9);
  const histogram = macdLine - macdSignal;
  const strength = Math.abs(histogram);
  
  // Simplified divergence detection
  const bullishDivergence = histogram > 0 && macdLine < macdSignal;
  const bearishDivergence = histogram < 0 && macdLine > macdSignal;
  
  return {
    line: macdLine,
    signal: macdSignal,
    histogram,
    strength,
    bullishDivergence,
    bearishDivergence
  };
};

// EMA calculation helper
const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
};

// SMA calculation helper
const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  return prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
};

// Professional Bollinger Bands with squeeze detection
export const calculateProfessionalBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
  position: 'above' | 'below' | 'within';
  squeeze: boolean;
  bandwidth: number;
} => {
  if (prices.length < period) {
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return {
      upper: avg,
      middle: avg,
      lower: avg,
      position: 'within',
      squeeze: false,
      bandwidth: 0
    };
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
  const squeeze = bandwidth < 0.002; // Professional squeeze threshold
  
  return { upper, middle, lower, position, squeeze, bandwidth };
};

// ATR calculation for volatility analysis
export const calculateATR = (ohlcvData: ProfessionalOHLCVData[], period: number = 14): number => {
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

// Professional pivot point calculation
export const calculatePivotPoints = (high: number, low: number, close: number): {
  pivot: number;
  support1: number;
  support2: number;
  support3: number;
  resistance1: number;
  resistance2: number;
  resistance3: number;
} => {
  const pivot = (high + low + close) / 3;
  
  const support1 = (2 * pivot) - high;
  const resistance1 = (2 * pivot) - low;
  
  const support2 = pivot - (high - low);
  const resistance2 = pivot + (high - low);
  
  const support3 = low - 2 * (high - pivot);
  const resistance3 = high + 2 * (pivot - low);
  
  return {
    pivot,
    support1,
    support2,
    support3,
    resistance1,
    resistance2,
    resistance3
  };
};

// Fibonacci retracement levels
export const calculateFibonacciLevels = (high: number, low: number, isUptrend: boolean = true): {
  retracements: { level: number; price: number }[];
  extensions: { level: number; price: number }[];
} => {
  const diff = high - low;
  const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
  const extLevels = [1.272, 1.414, 1.618, 2.0, 2.618];
  
  const retracements = fibLevels.map(level => ({
    level,
    price: isUptrend ? high - (diff * level) : low + (diff * level)
  }));
  
  const extensions = extLevels.map(level => ({
    level,
    price: isUptrend ? high + (diff * (level - 1)) : low - (diff * (level - 1))
  }));
  
  return { retracements, extensions };
};

// Support and resistance level detection
export const detectSupportResistanceLevels = (prices: number[], period: number = 50): {
  supportLevels: number[];
  resistanceLevels: number[];
} => {
  if (prices.length < period) return { supportLevels: [], resistanceLevels: [] };
  
  const recentPrices = prices.slice(-period);
  const tolerance = 0.001; // 0.1% tolerance for level grouping
  
  const peaks: number[] = [];
  const troughs: number[] = [];
  
  // Simple peak and trough detection
  for (let i = 1; i < recentPrices.length - 1; i++) {
    if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
      peaks.push(recentPrices[i]);
    }
    if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
      troughs.push(recentPrices[i]);
    }
  }
  
  // Group similar levels
  const groupLevels = (levels: number[]): number[] => {
    const grouped: number[] = [];
    const sorted = [...levels].sort((a, b) => a - b);
    
    let currentGroup = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i] - sorted[i - 1]) / sorted[i - 1] <= tolerance) {
        currentGroup.push(sorted[i]);
      } else {
        if (currentGroup.length >= 2) { // At least 2 touches
          grouped.push(currentGroup.reduce((sum, price) => sum + price, 0) / currentGroup.length);
        }
        currentGroup = [sorted[i]];
      }
    }
    
    if (currentGroup.length >= 2) {
      grouped.push(currentGroup.reduce((sum, price) => sum + price, 0) / currentGroup.length);
    }
    
    return grouped.slice(0, 5); // Top 5 levels
  };
  
  return {
    supportLevels: groupLevels(troughs),
    resistanceLevels: groupLevels(peaks)
  };
};

// Market regime detection
export const detectMarketRegime = (prices: number[], atr: number): {
  regime: 'trending' | 'ranging' | 'volatile';
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
} => {
  if (prices.length < 20) {
    return {
      regime: 'ranging',
      direction: 'neutral',
      strength: 0
    };
  }
  
  const recentPrices = prices.slice(-20);
  const currentPrice = prices[prices.length - 1];
  
  // Volatility assessment
  const avgPrice = currentPrice;
  const volatilityRatio = atr / avgPrice;
  
  if (volatilityRatio > 0.02) {
    return {
      regime: 'volatile',
      direction: 'neutral',
      strength: volatilityRatio
    };
  }
  
  // Trend detection using linear regression
  const n = recentPrices.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = recentPrices.reduce((sum, price) => sum + price, 0);
  const sumXY = recentPrices.reduce((sum, price, i) => sum + (i * price), 0);
  const sumX2 = recentPrices.reduce((sum, _, i) => sum + (i * i), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const slopeStrength = Math.abs(slope) / avgPrice;
  
  if (slopeStrength > 0.001) {
    return {
      regime: 'trending',
      direction: slope > 0 ? 'bullish' : 'bearish',
      strength: slopeStrength
    };
  }
  
  return {
    regime: 'ranging',
    direction: 'neutral',
    strength: slopeStrength
  };
};

// Comprehensive technical analysis
export const calculateProfessionalTechnicalIndicators = (
  ohlcvData: ProfessionalOHLCVData[]
): ProfessionalTechnicalIndicators => {
  const closes = ohlcvData.map(d => d.close);
  const highs = ohlcvData.map(d => d.high);
  const lows = ohlcvData.map(d => d.low);
  const currentPrice = closes[closes.length - 1];
  
  // Calculate all indicators
  const rsi = calculateProfessionalRSI(closes);
  const macd = calculateEnhancedMACD(closes);
  const bollingerBands = calculateProfessionalBollingerBands(closes);
  const atr14 = calculateATR(ohlcvData);
  
  // Moving averages
  const movingAverages = {
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    sma200: calculateSMA(closes, 200)
  };
  
  // Momentum indicators
  const momentum = {
    stochastic: calculateStochastic(highs, lows, closes),
    williamsR: calculateWilliamsR(highs, lows, closes),
    roc12: calculateROC(closes, 12)
  };
  
  // Volatility profile
  const volatilityProfile = assessVolatilityProfile(atr14, currentPrice);
  
  // Support/Resistance
  const supportResistance = detectSupportResistanceLevels(closes);
  
  // Pivot points (using last complete candle)
  const lastCandle = ohlcvData[ohlcvData.length - 1];
  const pivotPoints = calculatePivotPoints(lastCandle.high, lastCandle.low, lastCandle.close);
  
  // Fibonacci levels (using recent swing high/low)
  const recentHighs = highs.slice(-20);
  const recentLows = lows.slice(-20);
  const swingHigh = Math.max(...recentHighs);
  const swingLow = Math.min(...recentLows);
  const fibonacci = calculateFibonacciLevels(swingHigh, swingLow, currentPrice > swingLow);
  
  // Market regime
  const marketRegime = detectMarketRegime(closes, atr14);
  
  return {
    rsi,
    macd,
    bollingerBands,
    movingAverages,
    momentum,
    volatility: {
      atr14,
      profile: volatilityProfile
    },
    supportResistance,
    patterns: {
      candlestickPattern: null, // Would need more complex pattern recognition
      chartPattern: null,
      patternConfidence: 0
    },
    fibonacci,
    pivotPoints,
    marketRegime
  };
};

// Helper functions for momentum indicators
const calculateStochastic = (highs: number[], lows: number[], closes: number[], period: number = 14): number => {
  if (closes.length < period) return 50;
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  if (highestHigh === lowestLow) return 50;
  
  return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
};

const calculateWilliamsR = (highs: number[], lows: number[], closes: number[], period: number = 14): number => {
  if (closes.length < period) return -50;
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  if (highestHigh === lowestLow) return -50;
  
  return (((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100);
};

const calculateROC = (prices: number[], period: number = 12): number => {
  if (prices.length < period + 1) return 0;
  
  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - period];
  
  return ((currentPrice - pastPrice) / pastPrice) * 100;
};

const assessVolatilityProfile = (atr: number, currentPrice: number): 'low' | 'normal' | 'high' | 'extreme' => {
  const volatilityRatio = atr / currentPrice;
  
  if (volatilityRatio < 0.005) return 'low';
  if (volatilityRatio < 0.015) return 'normal';
  if (volatilityRatio < 0.025) return 'high';
  return 'extreme';
};

// Multi-timeframe alignment analysis
export const analyzeMultiTimeframeAlignment = (
  multiTimeframeIndicators: MultiTimeframeAnalysis['timeframes']
): MultiTimeframeAnalysis['alignment'] => {
  const timeframes = Object.values(multiTimeframeIndicators);
  
  let bullishAlignment = 0;
  let bearishAlignment = 0;
  
  timeframes.forEach(indicators => {
    const { marketRegime } = indicators;
    if (marketRegime.direction === 'bullish') bullishAlignment++;
    if (marketRegime.direction === 'bearish') bearishAlignment++;
  });
  
  const totalTimeframes = timeframes.length;
  const bullishPercentage = bullishAlignment / totalTimeframes;
  const bearishPercentage = bearishAlignment / totalTimeframes;
  
  let overallDirection: 'bullish' | 'bearish' | 'neutral';
  let confidence: number;
  
  if (bullishPercentage >= 0.67) {
    overallDirection = 'bullish';
    confidence = bullishPercentage;
  } else if (bearishPercentage >= 0.67) {
    overallDirection = 'bearish';
    confidence = bearishPercentage;
  } else {
    overallDirection = 'neutral';
    confidence = 0.5;
  }
  
  return {
    bullishAlignment,
    bearishAlignment,
    overallDirection,
    confidence
  };
};