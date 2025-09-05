// Advanced candlestick pattern detection for professional forex analysis
export interface CandlestickPattern {
  pattern: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
  reliability: 'high' | 'medium' | 'low';
  timeframe: string;
}

export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

// Main pattern detection function
export const detectCandlestickPatterns = (candles: OHLC[]): CandlestickPattern[] => {
  if (candles.length < 3) return [];
  
  const patterns: CandlestickPattern[] = [];
  
  // Single candlestick patterns
  const singlePatterns = [
    detectDoji,
    detectHammer,
    detectShootingStar,
    detectMarubozu,
    detectSpinningTop
  ];
  
  // Multi-candlestick patterns
  const multiPatterns = [
    detectEngulfing,
    detectHarami,
    detectMorningStar,
    detectEveningStar,
    detectThreeWhiteSoldiers,
    detectThreeBlackCrows
  ];
  
  // Check single patterns on recent candles
  for (let i = Math.max(0, candles.length - 5); i < candles.length; i++) {
    singlePatterns.forEach(patternDetector => {
      const pattern = patternDetector(candles[i]);
      if (pattern) patterns.push(pattern);
    });
  }
  
  // Check multi-candlestick patterns
  multiPatterns.forEach(patternDetector => {
    const pattern = patternDetector(candles);
    if (pattern) patterns.push(pattern);
  });
  
  return patterns;
};

// Single Candlestick Patterns
const detectDoji = (candle: OHLC): CandlestickPattern | null => {
  const bodySize = Math.abs(candle.close - candle.open);
  const totalRange = candle.high - candle.low;
  const bodyPercent = bodySize / totalRange;
  
  if (bodyPercent < 0.1 && totalRange > 0) {
    return {
      pattern: 'Doji',
      type: 'neutral',
      confidence: 70,
      description: 'Indecision pattern - potential reversal',
      reliability: 'medium',
      timeframe: '1H'
    };
  }
  return null;
};

const detectHammer = (candle: OHLC): CandlestickPattern | null => {
  const bodySize = Math.abs(candle.close - candle.open);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const totalRange = candle.high - candle.low;
  
  if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5 && totalRange > 0) {
    return {
      pattern: 'Hammer',
      type: 'bullish',
      confidence: 75,
      description: 'Bullish reversal pattern at support',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  return null;
};

const detectShootingStar = (candle: OHLC): CandlestickPattern | null => {
  const bodySize = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const totalRange = candle.high - candle.low;
  
  if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5 && totalRange > 0) {
    return {
      pattern: 'Shooting Star',
      type: 'bearish',
      confidence: 75,
      description: 'Bearish reversal pattern at resistance',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  return null;
};

const detectMarubozu = (candle: OHLC): CandlestickPattern | null => {
  const bodySize = Math.abs(candle.close - candle.open);
  const totalRange = candle.high - candle.low;
  const bodyPercent = bodySize / totalRange;
  
  if (bodyPercent > 0.95) {
    return {
      pattern: 'Marubozu',
      type: candle.close > candle.open ? 'bullish' : 'bearish',
      confidence: 80,
      description: `Strong ${candle.close > candle.open ? 'bullish' : 'bearish'} momentum`,
      reliability: 'high',
      timeframe: '1H'
    };
  }
  return null;
};

const detectSpinningTop = (candle: OHLC): CandlestickPattern | null => {
  const bodySize = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const totalRange = candle.high - candle.low;
  
  if (upperShadow > bodySize && lowerShadow > bodySize && totalRange > 0) {
    return {
      pattern: 'Spinning Top',
      type: 'neutral',
      confidence: 60,
      description: 'Indecision - potential reversal',
      reliability: 'medium',
      timeframe: '1H'
    };
  }
  return null;
};

// Multi-Candlestick Patterns
const detectEngulfing = (candles: OHLC[]): CandlestickPattern | null => {
  if (candles.length < 2) return null;
  
  const prev = candles[candles.length - 2];
  const current = candles[candles.length - 1];
  
  const prevBullish = prev.close > prev.open;
  const currentBullish = current.close > current.open;
  
  // Bullish engulfing
  if (!prevBullish && currentBullish && 
      current.open < prev.close && current.close > prev.open) {
    return {
      pattern: 'Bullish Engulfing',
      type: 'bullish',
      confidence: 85,
      description: 'Strong bullish reversal pattern',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  
  // Bearish engulfing
  if (prevBullish && !currentBullish && 
      current.open > prev.close && current.close < prev.open) {
    return {
      pattern: 'Bearish Engulfing',
      type: 'bearish',
      confidence: 85,
      description: 'Strong bearish reversal pattern',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  
  return null;
};

const detectHarami = (candles: OHLC[]): CandlestickPattern | null => {
  if (candles.length < 2) return null;
  
  const prev = candles[candles.length - 2];
  const current = candles[candles.length - 1];
  
  const prevBodySize = Math.abs(prev.close - prev.open);
  const currentBodySize = Math.abs(current.close - current.open);
  
  if (currentBodySize < prevBodySize * 0.5 &&
      current.high < Math.max(prev.open, prev.close) &&
      current.low > Math.min(prev.open, prev.close)) {
    
    const prevBullish = prev.close > prev.open;
    return {
      pattern: prevBullish ? 'Bearish Harami' : 'Bullish Harami',
      type: prevBullish ? 'bearish' : 'bullish',
      confidence: 70,
      description: 'Potential reversal pattern',
      reliability: 'medium',
      timeframe: '1H'
    };
  }
  
  return null;
};

const detectMorningStar = (candles: OHLC[]): CandlestickPattern | null => {
  if (candles.length < 3) return null;
  
  const first = candles[candles.length - 3];
  const middle = candles[candles.length - 2];
  const last = candles[candles.length - 1];
  
  const firstBearish = first.close < first.open;
  const lastBullish = last.close > last.open;
  const middleSmall = Math.abs(middle.close - middle.open) < Math.abs(first.close - first.open) * 0.3;
  
  if (firstBearish && lastBullish && middleSmall && 
      middle.high < first.close && last.close > (first.open + first.close) / 2) {
    return {
      pattern: 'Morning Star',
      type: 'bullish',
      confidence: 90,
      description: 'Very strong bullish reversal pattern',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  
  return null;
};

const detectEveningStar = (candles: OHLC[]): CandlestickPattern | null => {
  if (candles.length < 3) return null;
  
  const first = candles[candles.length - 3];
  const middle = candles[candles.length - 2];
  const last = candles[candles.length - 1];
  
  const firstBullish = first.close > first.open;
  const lastBearish = last.close < last.open;
  const middleSmall = Math.abs(middle.close - middle.open) < Math.abs(first.close - first.open) * 0.3;
  
  if (firstBullish && lastBearish && middleSmall && 
      middle.low > first.close && last.close < (first.open + first.close) / 2) {
    return {
      pattern: 'Evening Star',
      type: 'bearish',
      confidence: 90,
      description: 'Very strong bearish reversal pattern',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  
  return null;
};

const detectThreeWhiteSoldiers = (candles: OHLC[]): CandlestickPattern | null => {
  if (candles.length < 3) return null;
  
  const last3 = candles.slice(-3);
  const allBullish = last3.every(c => c.close > c.open);
  const increasing = last3[1].close > last3[0].close && last3[2].close > last3[1].close;
  
  if (allBullish && increasing) {
    return {
      pattern: 'Three White Soldiers',
      type: 'bullish',
      confidence: 85,
      description: 'Strong bullish continuation pattern',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  
  return null;
};

const detectThreeBlackCrows = (candles: OHLC[]): CandlestickPattern | null => {
  if (candles.length < 3) return null;
  
  const last3 = candles.slice(-3);
  const allBearish = last3.every(c => c.close < c.open);
  const decreasing = last3[1].close < last3[0].close && last3[2].close < last3[1].close;
  
  if (allBearish && decreasing) {
    return {
      pattern: 'Three Black Crows',
      type: 'bearish',
      confidence: 85,
      description: 'Strong bearish continuation pattern',
      reliability: 'high',
      timeframe: '1H'
    };
  }
  
  return null;
};