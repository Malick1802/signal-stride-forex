// ENHANCED: Strict technical indicators with improved accuracy standards
export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
    strength: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'above' | 'below' | 'within';
  };
  ema50: number;
  ema200: number;
  atr: number;
  trendAlignment: {
    isAligned: boolean;
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  };
}

// ENHANCED: RSI calculation with stricter thresholds
export const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// ENHANCED: Stricter RSI signal validation
export const validateRSISignal = (rsi: number, signalType: 'BUY' | 'SELL'): { isValid: boolean; strength: 'weak' | 'moderate' | 'strong' | 'extreme' } => {
  if (signalType === 'BUY') {
    if (rsi < 20) return { isValid: true, strength: 'extreme' };
    if (rsi < 25) return { isValid: true, strength: 'strong' };
    if (rsi < 30) return { isValid: true, strength: 'moderate' };
    return { isValid: false, strength: 'weak' };
  } else {
    if (rsi > 80) return { isValid: true, strength: 'extreme' };
    if (rsi > 75) return { isValid: true, strength: 'strong' };
    if (rsi > 70) return { isValid: true, strength: 'moderate' };
    return { isValid: false, strength: 'weak' };
  }
};

// ENHANCED: MACD with stricter validation
export const calculateMACD = (prices: number[]): { line: number; signal: number; histogram: number; strength: number } => {
  if (prices.length < 26) return { line: 0, signal: 0, histogram: 0, strength: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  const macdSignal = calculateEMA([macdLine], 9);
  const histogram = macdLine - macdSignal;
  
  const strength = Math.abs(macdLine - macdSignal);
  
  return { line: macdLine, signal: macdSignal, histogram, strength };
};

// ENHANCED: Stricter MACD signal validation
export const validateMACDSignal = (macd: { line: number; signal: number; histogram: number; strength: number }, signalType: 'BUY' | 'SELL'): { isValid: boolean; confirmations: string[] } => {
  const confirmations: string[] = [];
  
  if (signalType === 'BUY') {
    if (macd.line > macd.signal) confirmations.push('MACD Bullish Crossover');
    if (macd.histogram > 0) confirmations.push('Positive Histogram');
    if (macd.strength > 0.00001) confirmations.push('Strong MACD Signal'); // Increased threshold
  } else {
    if (macd.line < macd.signal) confirmations.push('MACD Bearish Crossover');
    if (macd.histogram < 0) confirmations.push('Negative Histogram');
    if (macd.strength > 0.00001) confirmations.push('Strong MACD Signal'); // Increased threshold
  }
  
  // ENHANCED: Require at least 2 confirmations
  return { isValid: confirmations.length >= 2, confirmations };
};

// EMA Calculation (unchanged but optimized)
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

// ENHANCED: Stricter trend alignment validation
export const validateTrendAlignment = (currentPrice: number, ema50: number, ema200: number, signalType: 'BUY' | 'SELL'): { isAligned: boolean; direction: 'bullish' | 'bearish' | 'neutral'; strength: number; confirmations: string[] } => {
  const confirmations: string[] = [];
  let strength = 0;
  
  const emaSeparation = Math.abs(ema50 - ema200) / currentPrice;
  
  if (signalType === 'BUY') {
    // ENHANCED: All conditions must be met
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
    
    // ENHANCED: Higher separation threshold (0.5% vs 0.3%)
    if (emaSeparation > 0.005 && ema50 > ema200) {
      confirmations.push('Strong Bullish EMA Separation');
    }
    
    // ENHANCED: All confirmations required
    const isAligned = confirmations.length >= 3;
    return { 
      isAligned, 
      direction: isAligned ? 'bullish' : 'neutral', 
      strength,
      confirmations 
    };
    
  } else {
    // ENHANCED: All conditions must be met for SELL
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
    
    // ENHANCED: Higher separation threshold
    if (emaSeparation > 0.005 && ema50 < ema200) {
      confirmations.push('Strong Bearish EMA Separation');
    }
    
    // ENHANCED: All confirmations required
    const isAligned = confirmations.length >= 3;
    return { 
      isAligned, 
      direction: isAligned ? 'bearish' : 'neutral', 
      strength,
      confirmations 
    };
  }
};

// ENHANCED: Stricter Bollinger Bands
export const calculateBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number; position: 'above' | 'below' | 'within' } => {
  if (prices.length < period) {
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return { upper: avg, middle: avg, lower: avg, position: 'within' };
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
  
  return { upper, middle, lower, position };
};

// ENHANCED: Much stricter Bollinger Band validation
export const validateBollingerBandSignal = (bands: { upper: number; middle: number; lower: number; position: 'above' | 'below' | 'within' }, signalType: 'BUY' | 'SELL'): { isValid: boolean; strength: 'weak' | 'moderate' | 'strong' } => {
  if (signalType === 'BUY') {
    // ENHANCED: Only accept clear oversold conditions
    if (bands.position === 'below') return { isValid: true, strength: 'strong' };
    return { isValid: false, strength: 'weak' };
  } else {
    // ENHANCED: Only accept clear overbought conditions
    if (bands.position === 'above') return { isValid: true, strength: 'strong' };
    return { isValid: false, strength: 'weak' };
  }
};

// Enhanced ATR calculation (unchanged)
export const calculateATR = (ohlcvData: OHLCVData[], period: number = 14): number => {
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

// Generate OHLCV data from price history (unchanged)
export const generateOHLCVFromPrices = (priceData: Array<{ timestamp: number; price: number }>): OHLCVData[] => {
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

// ENHANCED: Much stricter comprehensive technical analysis
export const calculateConservativeTechnicalIndicators = (ohlcvData: OHLCVData[], signalType?: 'BUY' | 'SELL'): TechnicalIndicators & { validationScore: number; confirmations: string[] } => {
  const closes = ohlcvData.map(d => d.close);
  const currentPrice = closes[closes.length - 1];
  
  // Calculate base indicators
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const bollingerBands = calculateBollingerBands(closes);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const atr = calculateATR(ohlcvData);
  
  // ENHANCED: Much stricter validations
  let validationScore = 0;
  const allConfirmations: string[] = [];
  
  if (signalType) {
    // RSI validation - ENHANCED thresholds
    const rsiValidation = validateRSISignal(rsi, signalType);
    if (rsiValidation.isValid) {
      const rsiPoints = rsiValidation.strength === 'extreme' ? 4 : rsiValidation.strength === 'strong' ? 3 : 2;
      validationScore += rsiPoints;
      allConfirmations.push(`RSI ${rsiValidation.strength} ${signalType.toLowerCase()} signal`);
    }
    
    // MACD validation - ENHANCED requirements
    const macdValidation = validateMACDSignal(macd, signalType);
    if (macdValidation.isValid) {
      validationScore += macdValidation.confirmations.length * 2; // Increased scoring
      allConfirmations.push(...macdValidation.confirmations);
    }
    
    // Trend alignment - ENHANCED requirements
    const trendValidation = validateTrendAlignment(currentPrice, ema50, ema200, signalType);
    if (trendValidation.isAligned) {
      validationScore += Math.round(trendValidation.strength * 4); // Increased multiplier
      allConfirmations.push(...trendValidation.confirmations);
    }
    
    // Bollinger Band validation - ENHANCED criteria
    const bbValidation = validateBollingerBandSignal(bollingerBands, signalType);
    if (bbValidation.isValid) {
      validationScore += bbValidation.strength === 'strong' ? 3 : 1;
      allConfirmations.push(`Bollinger Band ${bbValidation.strength} confirmation`);
    }
  }
  
  // Determine trend alignment
  const trendAlignment = {
    isAligned: signalType ? validateTrendAlignment(currentPrice, ema50, ema200, signalType).isAligned : false,
    direction: currentPrice > ema50 && ema50 > ema200 ? 'bullish' as const : 
               currentPrice < ema50 && ema50 < ema200 ? 'bearish' as const : 'neutral' as const,
    strength: Math.abs(ema50 - ema200) / currentPrice
  };
  
  return {
    rsi,
    macd,
    bollingerBands: {
      ...bollingerBands,
      position: bollingerBands.position
    },
    ema50,
    ema200,
    atr,
    trendAlignment,
    validationScore,
    confirmations: allConfirmations
  };
};

// ENHANCED: Much stricter signal quality scoring
export const calculateConservativeSignalScore = (indicators: TechnicalIndicators & { validationScore: number; confirmations: string[] }, signalType: 'BUY' | 'SELL'): { score: number; grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; isConservativeQuality: boolean } => {
  let score = indicators.validationScore;
  
  // ENHANCED: Higher bonus requirements
  if (indicators.confirmations.length >= 6) score += 4; // Increased requirement
  else if (indicators.confirmations.length >= 4) score += 2; // Increased requirement
  else if (indicators.confirmations.length >= 3) score += 1;
  
  // Bonus for strong trend alignment
  if (indicators.trendAlignment.isAligned && indicators.trendAlignment.strength > 0.008) { // Increased threshold
    score += 2;
  }
  
  // Normalize score to 0-15 scale (increased range)
  const normalizedScore = Math.min(score, 15);
  
  // ENHANCED: Much stricter grading thresholds
  let grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  if (normalizedScore >= 12) grade = 'EXCELLENT'; // Much higher threshold
  else if (normalizedScore >= 9) grade = 'GOOD'; // Much higher threshold
  else if (normalizedScore >= 6) grade = 'FAIR'; // Much higher threshold
  else grade = 'POOR';
  
  // ENHANCED: Only accept EXCELLENT signals with minimum 4 confirmations
  const isConservativeQuality = grade === 'EXCELLENT' && 
                               indicators.confirmations.length >= 4 &&
                               indicators.trendAlignment.isAligned;
  
  return { score: normalizedScore, grade, isConservativeQuality };
};
