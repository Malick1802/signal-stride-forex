
// Enhanced chart pattern detection for professional forex analysis
import { OHLCVData } from './technicalAnalysis';
import { detectCandlestickPatterns, CandlestickPattern, OHLC } from './candlestickPatternDetection';
import { findKeyLevels, determineTrend, calculatePatternStrength } from './enhancedPatternHelpers';

export interface ChartPattern {
  pattern: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
  target?: number;
  timeframe: string;
  reliability: 'high' | 'medium' | 'low';
}

export interface EnhancedPatternAnalysis {
  chartPatterns: ChartPattern[];
  candlestickPatterns: CandlestickPattern[];
  supportLevels: number[];
  resistanceLevels: number[];
  trendDirection: 'uptrend' | 'downtrend' | 'sideways';
  patternStrength: number;
}

// Enhanced pattern detection with candlestick analysis
export const detectEnhancedPatterns = (ohlcvData: OHLCVData[], currentPrice: number): EnhancedPatternAnalysis => {
  if (ohlcvData.length < 10) {
    return {
      chartPatterns: [],
      candlestickPatterns: [],
      supportLevels: [],
      resistanceLevels: [],
      trendDirection: 'sideways',
      patternStrength: 0
    };
  }

  // Convert OHLCV to OHLC for candlestick analysis
  const ohlcCandles: OHLC[] = ohlcvData.map(d => ({
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    timestamp: d.timestamp
  }));

  // Detect all pattern types
  const chartPatterns = detectChartPatterns(ohlcvData, currentPrice);
  const candlestickPatterns = detectCandlestickPatterns(ohlcCandles);
  const { supportLevels, resistanceLevels } = findKeyLevels(ohlcvData);
  const trendDirection = determineTrend(ohlcvData);
  const patternStrength = calculatePatternStrength(chartPatterns, candlestickPatterns);

  return {
    chartPatterns,
    candlestickPatterns,
    supportLevels,
    resistanceLevels,
    trendDirection,
    patternStrength
  };
};

// Original chart pattern detection
export const detectChartPatterns = (ohlcvData: OHLCVData[], currentPrice: number): ChartPattern[] => {
  if (ohlcvData.length < 10) return [];
  
  const patterns: ChartPattern[] = [];
  const highs = ohlcvData.map(d => d.high);
  const lows = ohlcvData.map(d => d.low);
  const closes = ohlcvData.map(d => d.close);
  
  // Double Bottom Detection
  const doubleBottom = detectDoubleBottom(lows, closes, currentPrice);
  if (doubleBottom) patterns.push(doubleBottom);
  
  // Double Top Detection
  const doubleTop = detectDoubleTop(highs, closes, currentPrice);
  if (doubleTop) patterns.push(doubleTop);
  
  // Head and Shoulders Detection
  const headAndShoulders = detectHeadAndShoulders(highs, closes, currentPrice);
  if (headAndShoulders) patterns.push(headAndShoulders);
  
  // Ascending Triangle
  const ascendingTriangle = detectAscendingTriangle(highs, lows, currentPrice);
  if (ascendingTriangle) patterns.push(ascendingTriangle);
  
  // Support/Resistance Levels
  const supportResistance = detectSupportResistance(highs, lows, currentPrice);
  if (supportResistance) patterns.push(supportResistance);
  
  return patterns;
};

const detectDoubleBottom = (lows: number[], closes: number[], currentPrice: number): ChartPattern | null => {
  if (lows.length < 20) return null;
  
  const recentLows = lows.slice(-20);
  const minPrice = Math.min(...recentLows);
  const minIndices = recentLows.map((low, i) => ({ price: low, index: i }))
    .filter(item => Math.abs(item.price - minPrice) < minPrice * 0.002)
    .map(item => item.index);
  
  if (minIndices.length >= 2 && minIndices[minIndices.length - 1] - minIndices[0] > 5) {
    const confidence = currentPrice > minPrice * 1.01 ? 75 : 60;
    return {
      pattern: 'Double Bottom',
      type: 'bullish',
      confidence,
      description: `Double bottom pattern detected at ${minPrice.toFixed(5)} level`,
      target: minPrice * 1.02,
      timeframe: '1H',
      reliability: 'high'
    };
  }
  
  return null;
};

const detectDoubleTop = (highs: number[], closes: number[], currentPrice: number): ChartPattern | null => {
  if (highs.length < 20) return null;
  
  const recentHighs = highs.slice(-20);
  const maxPrice = Math.max(...recentHighs);
  const maxIndices = recentHighs.map((high, i) => ({ price: high, index: i }))
    .filter(item => Math.abs(item.price - maxPrice) < maxPrice * 0.002)
    .map(item => item.index);
  
  if (maxIndices.length >= 2 && maxIndices[maxIndices.length - 1] - maxIndices[0] > 5) {
    const confidence = currentPrice < maxPrice * 0.99 ? 75 : 60;
    return {
      pattern: 'Double Top',
      type: 'bearish',
      confidence,
      description: `Double top pattern detected at ${maxPrice.toFixed(5)} level`,
      target: maxPrice * 0.98,
      timeframe: '1H',
      reliability: 'high'
    };
  }
  
  return null;
};

const detectHeadAndShoulders = (highs: number[], closes: number[], currentPrice: number): ChartPattern | null => {
  if (highs.length < 15) return null;
  
  const recentHighs = highs.slice(-15);
  if (recentHighs.length < 15) return null;
  
  // Simple H&S detection: look for three peaks with middle being highest
  const peaks = [];
  for (let i = 2; i < recentHighs.length - 2; i++) {
    if (recentHighs[i] > recentHighs[i-1] && recentHighs[i] > recentHighs[i+1] &&
        recentHighs[i] > recentHighs[i-2] && recentHighs[i] > recentHighs[i+2]) {
      peaks.push({ price: recentHighs[i], index: i });
    }
  }
  
  if (peaks.length >= 3) {
    const head = peaks.find(p => p.price === Math.max(...peaks.map(peak => peak.price)));
    const shoulders = peaks.filter(p => p !== head);
    
    if (head && shoulders.length >= 2) {
      return {
        pattern: 'Head and Shoulders',
        type: 'bearish',
        confidence: 70,
        description: `Head and shoulders pattern with head at ${head.price.toFixed(5)}`,
        target: head.price * 0.97,
        timeframe: '1H',
        reliability: 'high'
      };
    }
  }
  
  return null;
};

const detectAscendingTriangle = (highs: number[], lows: number[], currentPrice: number): ChartPattern | null => {
  if (highs.length < 10) return null;
  
  const recentHighs = highs.slice(-10);
  const recentLows = lows.slice(-10);
  
  // Check if highs are relatively flat (resistance)
  const maxHigh = Math.max(...recentHighs);
  const minHigh = Math.min(...recentHighs);
  const highsFlat = (maxHigh - minHigh) / maxHigh < 0.005;
  
  // Check if lows are ascending
  const firstHalfLows = recentLows.slice(0, 5);
  const secondHalfLows = recentLows.slice(5);
  const lowsAscending = Math.min(...secondHalfLows) > Math.min(...firstHalfLows);
  
  if (highsFlat && lowsAscending) {
    return {
      pattern: 'Ascending Triangle',
      type: 'bullish',
      confidence: 65,
      description: `Ascending triangle with resistance at ${maxHigh.toFixed(5)}`,
      target: maxHigh * 1.01,
      timeframe: '1H',
      reliability: 'medium'
    };
  }
  
  return null;
};

const detectSupportResistance = (highs: number[], lows: number[], currentPrice: number): ChartPattern | null => {
  const recentHighs = highs.slice(-20);
  const recentLows = lows.slice(-20);
  
  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);
  
  const distanceToResistance = (resistance - currentPrice) / currentPrice;
  const distanceToSupport = (currentPrice - support) / currentPrice;
  
  if (distanceToResistance < 0.01) {
    return {
      pattern: 'Near Resistance',
      type: 'bearish',
      confidence: 80,
      description: `Price near key resistance level at ${resistance.toFixed(5)}`,
      timeframe: '1H',
      reliability: 'medium'
    };
  }
  
  if (distanceToSupport < 0.01) {
    return {
      pattern: 'Near Support',
      type: 'bullish',
      confidence: 80,
      description: `Price near key support level at ${support.toFixed(5)}`,
      timeframe: '1H',
      reliability: 'medium'
    };
  }
  
  return null;
};
