// RELAXED: Conservative technical indicators for more flexible forex analysis
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
    strength: number; // Added for conservative analysis
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'above' | 'below' | 'within'; // Added for position analysis
  };
  ema50: number;
  ema200: number;
  atr: number;
  trendAlignment: {
    isAligned: boolean;
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-1 scale
  };
}

// RELAXED: RSI calculation with more flexible thresholds
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

// RELAXED: RSI signal validation with wider thresholds
export const validateRSISignal = (rsi: number, signalType: 'BUY' | 'SELL'): { isValid: boolean; strength: 'weak' | 'moderate' | 'strong' | 'extreme' } => {
  if (signalType === 'BUY') {
    if (rsi < 25) return { isValid: true, strength: 'extreme' };
    if (rsi < 30) return { isValid: true, strength: 'strong' };
    if (rsi < 40) return { isValid: true, strength: 'moderate' }; // RELAXED: was 35
    return { isValid: false, strength: 'weak' };
  } else {
    if (rsi > 75) return { isValid: true, strength: 'extreme' };
    if (rsi > 70) return { isValid: true, strength: 'strong' };
    if (rsi > 60) return { isValid: true, strength: 'moderate' }; // RELAXED: was 65
    return { isValid: false, strength: 'weak' };
  }
};

// RELAXED: MACD with histogram strength calculation
export const calculateMACD = (prices: number[]): { line: number; signal: number; histogram: number; strength: number } => {
  if (prices.length < 26) return { line: 0, signal: 0, histogram: 0, strength: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  const macdSignal = calculateEMA([macdLine], 9);
  const histogram = macdLine - macdSignal;
  
  // Calculate strength as the absolute distance between line and signal
  const strength = Math.abs(macdLine - macdSignal);
  
  return { line: macdLine, signal: macdSignal, histogram, strength };
};

// RELAXED: More flexible MACD signal validation
export const validateMACDSignal = (macd: { line: number; signal: number; histogram: number; strength: number }, signalType: 'BUY' | 'SELL'): { isValid: boolean; confirmations: string[] } => {
  const confirmations: string[] = [];
  
  if (signalType === 'BUY') {
    if (macd.line > macd.signal) confirmations.push('MACD Bullish Crossover');
    if (macd.histogram > 0) confirmations.push('Positive Histogram');
    if (macd.strength > 0.000005) confirmations.push('Strong MACD Signal'); // RELAXED: lowered threshold
  } else {
    if (macd.line < macd.signal) confirmations.push('MACD Bearish Crossover');
    if (macd.histogram < 0) confirmations.push('Negative Histogram');
    if (macd.strength > 0.000005) confirmations.push('Strong MACD Signal'); // RELAXED: lowered threshold
  }
  
  // RELAXED: require only 1 confirmation instead of 2
  return { isValid: confirmations.length >= 1, confirmations };
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

// RELAXED: More flexible trend alignment validation
export const validateTrendAlignment = (currentPrice: number, ema50: number, ema200: number, signalType: 'BUY' | 'SELL'): { isAligned: boolean; direction: 'bullish' | 'bearish' | 'neutral'; strength: number; confirmations: string[] } => {
  const confirmations: string[] = [];
  let strength = 0;
  
  // Calculate EMA separation as percentage of current price
  const emaSeparation = Math.abs(ema50 - ema200) / currentPrice;
  
  if (signalType === 'BUY') {
    // RELAXED: Accept partial alignment
    if (currentPrice > ema50) {
      confirmations.push('Price Above EMA50');
      strength += 0.5; // RELAXED: increased weight
    }
    if (currentPrice > ema200) {
      confirmations.push('Price Above EMA200');
      strength += 0.3;
    }
    if (ema50 > ema200) {
      confirmations.push('EMA50 Above EMA200');
      strength += 0.2;
    }
    
    // RELAXED: Lower separation threshold (0.3% vs 0.5%)
    if (emaSeparation > 0.003 && ema50 > ema200) {
      confirmations.push('Good Bullish EMA Separation');
      strength += 0.1;
    }
    
    // RELAXED: Accept any confirmation as valid
    const isAligned = confirmations.length > 0;
    return { 
      isAligned, 
      direction: isAligned ? 'bullish' : 'neutral', 
      strength: Math.min(strength, 1),
      confirmations 
    };
    
  } else {
    // RELAXED: Accept partial alignment for SELL
    if (currentPrice < ema50) {
      confirmations.push('Price Below EMA50');
      strength += 0.5; // RELAXED: increased weight
    }
    if (currentPrice < ema200) {
      confirmations.push('Price Below EMA200');
      strength += 0.3;
    }
    if (ema50 < ema200) {
      confirmations.push('EMA50 Below EMA200');
      strength += 0.2;
    }
    
    // RELAXED: Lower separation threshold
    if (emaSeparation > 0.003 && ema50 < ema200) {
      confirmations.push('Good Bearish EMA Separation');
      strength += 0.1;
    }
    
    // RELAXED: Accept any confirmation as valid
    const isAligned = confirmations.length > 0;
    return { 
      isAligned, 
      direction: isAligned ? 'bearish' : 'neutral', 
      strength: Math.min(strength, 1),
      confirmations 
    };
  }
};

// RELAXED: Bollinger Bands with position analysis
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
  
  // Determine current price position
  const currentPrice = prices[prices.length - 1];
  let position: 'above' | 'below' | 'within' = 'within';
  
  if (currentPrice > upper) position = 'above';
  else if (currentPrice < lower) position = 'below';
  
  return { upper, middle, lower, position };
};

// RELAXED: More flexible Bollinger Band signal validation
export const validateBollingerBandSignal = (bands: { upper: number; middle: number; lower: number; position: 'above' | 'below' | 'within' }, signalType: 'BUY' | 'SELL'): { isValid: boolean; strength: 'weak' | 'moderate' | 'strong' } => {
  if (signalType === 'BUY') {
    // RELAXED: Accept both below and within bands as potential BUY signals
    if (bands.position === 'below') return { isValid: true, strength: 'strong' };
    if (bands.position === 'within') return { isValid: true, strength: 'moderate' }; // RELAXED: added
    return { isValid: false, strength: 'weak' };
  } else {
    // RELAXED: Accept both above and within bands as potential SELL signals
    if (bands.position === 'above') return { isValid: true, strength: 'strong' };
    if (bands.position === 'within') return { isValid: true, strength: 'moderate' }; // RELAXED: added
    return { isValid: false, strength: 'weak' };
  }
};

// ENHANCED: Conservative ATR calculation
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
  
  // Group prices by hour to create candlesticks
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

// RELAXED: More flexible comprehensive technical analysis
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
  
  // RELAXED: More flexible validations
  let validationScore = 0;
  const allConfirmations: string[] = [];
  
  if (signalType) {
    // RSI validation with relaxed thresholds
    const rsiValidation = validateRSISignal(rsi, signalType);
    if (rsiValidation.isValid) {
      validationScore += rsiValidation.strength === 'extreme' ? 3 : rsiValidation.strength === 'strong' ? 2.5 : rsiValidation.strength === 'moderate' ? 2 : 1; // RELAXED: increased moderate scoring
      allConfirmations.push(`RSI ${rsiValidation.strength} ${signalType.toLowerCase()} signal`);
    }
    
    // MACD validation with relaxed requirements
    const macdValidation = validateMACDSignal(macd, signalType);
    if (macdValidation.isValid) {
      validationScore += macdValidation.confirmations.length * 1.5; // RELAXED: increased scoring
      allConfirmations.push(...macdValidation.confirmations);
    }
    
    // Trend alignment validation with relaxed requirements
    const trendValidation = validateTrendAlignment(currentPrice, ema50, ema200, signalType);
    if (trendValidation.isAligned) {
      validationScore += Math.round(trendValidation.strength * 2.5); // RELAXED: increased multiplier
      allConfirmations.push(...trendValidation.confirmations);
    }
    
    // Bollinger Band validation with relaxed criteria
    const bbValidation = validateBollingerBandSignal(bollingerBands, signalType);
    if (bbValidation.isValid) {
      validationScore += bbValidation.strength === 'strong' ? 2 : 1.5; // RELAXED: increased scoring
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

// RELAXED: More flexible signal quality scoring
export const calculateConservativeSignalScore = (indicators: TechnicalIndicators & { validationScore: number; confirmations: string[] }, signalType: 'BUY' | 'SELL'): { score: number; grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; isConservativeQuality: boolean } => {
  let score = indicators.validationScore;
  
  // RELAXED: Lower bonus requirements
  if (indicators.confirmations.length >= 3) score += 2; // RELAXED: was 5
  else if (indicators.confirmations.length >= 2) score += 1; // RELAXED: was 3
  
  // Bonus for trend alignment (relaxed threshold)
  if (indicators.trendAlignment.isAligned && indicators.trendAlignment.strength > 0.003) { // RELAXED: was 0.005
    score += 0.5; // RELAXED: reduced bonus
  }
  
  // Normalize score to 0-10 scale
  const normalizedScore = Math.min(score, 10);
  
  // RELAXED: More lenient grading thresholds
  let grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  if (normalizedScore >= 7) grade = 'EXCELLENT'; // RELAXED: was 8
  else if (normalizedScore >= 5) grade = 'GOOD'; // RELAXED: was 6
  else if (normalizedScore >= 3) grade = 'FAIR'; // RELAXED: was 4
  else grade = 'POOR';
  
  // RELAXED: Accept GOOD, FAIR grades AND reduce confirmation requirement
  const isConservativeQuality = (grade === 'EXCELLENT' || grade === 'GOOD' || grade === 'FAIR') && indicators.confirmations.length >= 2; // RELAXED: was 3
  
  return { score: normalizedScore, grade, isConservativeQuality };
};
