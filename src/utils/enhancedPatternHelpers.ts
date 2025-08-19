// Helper functions for enhanced pattern detection
import { OHLCVData } from './technicalAnalysis';

// Find key support and resistance levels
export const findKeyLevels = (ohlcvData: OHLCVData[]): {
  supportLevels: number[];
  resistanceLevels: number[];
} => {
  if (ohlcvData.length < 20) return { supportLevels: [], resistanceLevels: [] };

  const highs = ohlcvData.map(d => d.high);
  const lows = ohlcvData.map(d => d.low);

  // Find significant highs and lows
  const significantHighs: number[] = [];
  const significantLows: number[] = [];

  for (let i = 2; i < ohlcvData.length - 2; i++) {
    // Check for local highs
    if (highs[i] > highs[i-1] && highs[i] > highs[i+1] &&
        highs[i] > highs[i-2] && highs[i] > highs[i+2]) {
      significantHighs.push(highs[i]);
    }

    // Check for local lows
    if (lows[i] < lows[i-1] && lows[i] < lows[i+1] &&
        lows[i] < lows[i-2] && lows[i] < lows[i+2]) {
      significantLows.push(lows[i]);
    }
  }

  // Group similar levels (within 0.1% of each other)
  const groupLevels = (levels: number[]): number[] => {
    if (levels.length === 0) return [];
    
    const sorted = [...levels].sort((a, b) => a - b);
    const grouped: number[] = [];
    let currentGroup = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.abs(sorted[i] - sorted[i-1]) / sorted[i-1];
      if (diff < 0.001) { // Within 0.1%
        currentGroup.push(sorted[i]);
      } else {
        // Average the group and add to result
        const avg = currentGroup.reduce((sum, val) => sum + val, 0) / currentGroup.length;
        grouped.push(avg);
        currentGroup = [sorted[i]];
      }
    }

    // Don't forget the last group
    const avg = currentGroup.reduce((sum, val) => sum + val, 0) / currentGroup.length;
    grouped.push(avg);

    return grouped;
  };

  return {
    supportLevels: groupLevels(significantLows).slice(0, 5), // Top 5 support levels
    resistanceLevels: groupLevels(significantHighs).slice(0, 5) // Top 5 resistance levels
  };
};

// Determine overall trend direction
export const determineTrend = (ohlcvData: OHLCVData[]): 'uptrend' | 'downtrend' | 'sideways' => {
  if (ohlcvData.length < 20) return 'sideways';

  const closes = ohlcvData.map(d => d.close);
  const recentCloses = closes.slice(-20);
  
  // Calculate simple moving averages
  const sma5 = recentCloses.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
  const sma10 = recentCloses.slice(-10).reduce((sum, val) => sum + val, 0) / 10;
  const sma20 = recentCloses.reduce((sum, val) => sum + val, 0) / 20;

  // Determine trend based on MA alignment
  if (sma5 > sma10 && sma10 > sma20) {
    return 'uptrend';
  } else if (sma5 < sma10 && sma10 < sma20) {
    return 'downtrend';
  } else {
    return 'sideways';
  }
};

// Calculate overall pattern strength
export const calculatePatternStrength = (chartPatterns: any[], candlestickPatterns: any[]): number => {
  if (chartPatterns.length === 0 && candlestickPatterns.length === 0) return 0;

  let totalStrength = 0;
  let patternCount = 0;

  // Chart patterns contribute more weight
  chartPatterns.forEach(pattern => {
    let weight = 1;
    if (pattern.reliability === 'high') weight = 1.5;
    if (pattern.reliability === 'low') weight = 0.5;
    
    totalStrength += (pattern.confidence / 100) * weight;
    patternCount += weight;
  });

  // Candlestick patterns
  candlestickPatterns.forEach(pattern => {
    let weight = 0.8; // Slightly less weight than chart patterns
    if (pattern.reliability === 'high') weight = 1.2;
    if (pattern.reliability === 'low') weight = 0.4;
    
    totalStrength += (pattern.confidence / 100) * weight;
    patternCount += weight;
  });

  return patternCount > 0 ? Math.min(100, (totalStrength / patternCount) * 100) : 0;
};

// Detect price action signals
export const detectPriceActionSignals = (ohlcvData: OHLCVData[]): {
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  description: string;
} => {
  if (ohlcvData.length < 10) return { signal: 'neutral', strength: 0, description: 'Insufficient data' };

  const recent = ohlcvData.slice(-10);
  const currentPrice = recent[recent.length - 1].close;
  
  // Check for breakouts
  const recentHighs = recent.map(d => d.high);
  const recentLows = recent.map(d => d.low);
  const highestHigh = Math.max(...recentHighs.slice(0, -1));
  const lowestLow = Math.min(...recentLows.slice(0, -1));
  
  // Bullish breakout
  if (currentPrice > highestHigh) {
    return {
      signal: 'bullish',
      strength: 75,
      description: 'Bullish breakout above recent highs'
    };
  }
  
  // Bearish breakdown
  if (currentPrice < lowestLow) {
    return {
      signal: 'bearish',
      strength: 75,
      description: 'Bearish breakdown below recent lows'
    };
  }
  
  // Check for consolidation
  const range = (Math.max(...recentHighs) - Math.min(...recentLows)) / currentPrice;
  if (range < 0.01) { // Less than 1% range
    return {
      signal: 'neutral',
      strength: 50,
      description: 'Price consolidating in tight range'
    };
  }
  
  return {
    signal: 'neutral',
    strength: 30,
    description: 'No clear price action signal'
  };
};