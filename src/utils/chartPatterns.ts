
export interface ChartPattern {
  type: string;
  confidence: number;
  support?: number;
  resistance?: number;
  target?: number;
  description: string;
}

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class PatternRecognition {
  // Detect Double Top pattern
  static detectDoubleTop(ohlcData: OHLCVData[]): ChartPattern | null {
    if (ohlcData.length < 20) return null;
    
    const highs = ohlcData.map(d => d.high);
    const closes = ohlcData.map(d => d.close);
    const recentData = ohlcData.slice(-20);
    
    // Find local peaks
    const peaks = this.findPeaks(highs.slice(-20), 3);
    
    if (peaks.length >= 2) {
      const lastTwoPeaks = peaks.slice(-2);
      const [peak1, peak2] = lastTwoPeaks;
      
      // Check if peaks are roughly equal (within 2%)
      const priceDiff = Math.abs(highs[peak1] - highs[peak2]) / highs[peak1];
      
      if (priceDiff < 0.02 && peak2 > peak1 + 5) {
        const resistance = Math.max(highs[peak1], highs[peak2]);
        const currentPrice = closes[closes.length - 1];
        
        return {
          type: 'Double Top',
          confidence: 70 + (30 * (1 - priceDiff)), // Higher confidence for closer peaks
          resistance,
          target: currentPrice - (resistance - currentPrice) * 0.618, // 61.8% retracement
          description: `Bearish double top pattern detected at ${resistance.toFixed(5)}`
        };
      }
    }
    
    return null;
  }

  // Detect Double Bottom pattern
  static detectDoubleBottom(ohlcData: OHLCVData[]): ChartPattern | null {
    if (ohlcData.length < 20) return null;
    
    const lows = ohlcData.map(d => d.low);
    const closes = ohlcData.map(d => d.close);
    
    // Find local troughs
    const troughs = this.findTroughs(lows.slice(-20), 3);
    
    if (troughs.length >= 2) {
      const lastTwoTroughs = troughs.slice(-2);
      const [trough1, trough2] = lastTwoTroughs;
      
      // Check if troughs are roughly equal (within 2%)
      const priceDiff = Math.abs(lows[trough1] - lows[trough2]) / lows[trough1];
      
      if (priceDiff < 0.02 && trough2 > trough1 + 5) {
        const support = Math.min(lows[trough1], lows[trough2]);
        const currentPrice = closes[closes.length - 1];
        
        return {
          type: 'Double Bottom',
          confidence: 70 + (30 * (1 - priceDiff)),
          support,
          target: currentPrice + (currentPrice - support) * 0.618,
          description: `Bullish double bottom pattern detected at ${support.toFixed(5)}`
        };
      }
    }
    
    return null;
  }

  // Detect Head and Shoulders pattern
  static detectHeadAndShoulders(ohlcData: OHLCVData[]): ChartPattern | null {
    if (ohlcData.length < 25) return null;
    
    const highs = ohlcData.map(d => d.high);
    const closes = ohlcData.map(d => d.close);
    const peaks = this.findPeaks(highs.slice(-25), 4);
    
    if (peaks.length >= 3) {
      const [leftShoulder, head, rightShoulder] = peaks.slice(-3);
      
      // Check H&S criteria: head higher than both shoulders, shoulders roughly equal
      const headPrice = highs[head];
      const leftShoulderPrice = highs[leftShoulder];
      const rightShoulderPrice = highs[rightShoulder];
      
      const shoulderDiff = Math.abs(leftShoulderPrice - rightShoulderPrice) / leftShoulderPrice;
      
      if (headPrice > leftShoulderPrice && 
          headPrice > rightShoulderPrice && 
          shoulderDiff < 0.03) {
        
        const neckline = (leftShoulderPrice + rightShoulderPrice) / 2;
        const currentPrice = closes[closes.length - 1];
        
        return {
          type: 'Head and Shoulders',
          confidence: 75 + (25 * (1 - shoulderDiff)),
          resistance: headPrice,
          support: neckline,
          target: neckline - (headPrice - neckline),
          description: `Bearish head and shoulders pattern with neckline at ${neckline.toFixed(5)}`
        };
      }
    }
    
    return null;
  }

  // Detect Ascending Triangle
  static detectAscendingTriangle(ohlcData: OHLCVData[]): ChartPattern | null {
    if (ohlcData.length < 15) return null;
    
    const highs = ohlcData.map(d => d.high);
    const lows = ohlcData.map(d => d.low);
    const closes = ohlcData.map(d => d.close);
    
    const recentHighs = highs.slice(-15);
    const recentLows = lows.slice(-15);
    
    // Check for horizontal resistance and ascending support
    const maxHigh = Math.max(...recentHighs);
    const highsNearMax = recentHighs.filter(h => Math.abs(h - maxHigh) / maxHigh < 0.01).length;
    
    // Check if lows are generally ascending
    const firstHalfLows = recentLows.slice(0, 7);
    const secondHalfLows = recentLows.slice(8);
    const avgFirstHalfLows = firstHalfLows.reduce((sum, low) => sum + low, 0) / firstHalfLows.length;
    const avgSecondHalfLows = secondHalfLows.reduce((sum, low) => sum + low, 0) / secondHalfLows.length;
    
    if (highsNearMax >= 2 && avgSecondHalfLows > avgFirstHalfLows) {
      const currentPrice = closes[closes.length - 1];
      
      return {
        type: 'Ascending Triangle',
        confidence: 65,
        resistance: maxHigh,
        support: avgSecondHalfLows,
        target: maxHigh + (maxHigh - avgSecondHalfLows) * 0.5,
        description: `Bullish ascending triangle with resistance at ${maxHigh.toFixed(5)}`
      };
    }
    
    return null;
  }

  // Helper function to find peaks
  private static findPeaks(data: number[], minDistance: number = 3): number[] {
    const peaks: number[] = [];
    
    for (let i = minDistance; i < data.length - minDistance; i++) {
      let isPeak = true;
      
      // Check if current point is higher than surrounding points
      for (let j = i - minDistance; j <= i + minDistance; j++) {
        if (j !== i && data[j] >= data[i]) {
          isPeak = false;
          break;
        }
      }
      
      if (isPeak) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  // Helper function to find troughs
  private static findTroughs(data: number[], minDistance: number = 3): number[] {
    const troughs: number[] = [];
    
    for (let i = minDistance; i < data.length - minDistance; i++) {
      let isTrough = true;
      
      // Check if current point is lower than surrounding points
      for (let j = i - minDistance; j <= i + minDistance; j++) {
        if (j !== i && data[j] <= data[i]) {
          isTrough = false;
          break;
        }
      }
      
      if (isTrough) {
        troughs.push(i);
      }
    }
    
    return troughs;
  }

  // Detect all patterns
  static detectAllPatterns(ohlcData: OHLCVData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    
    const doubleTop = this.detectDoubleTop(ohlcData);
    if (doubleTop) patterns.push(doubleTop);
    
    const doubleBottom = this.detectDoubleBottom(ohlcData);
    if (doubleBottom) patterns.push(doubleBottom);
    
    const headAndShoulders = this.detectHeadAndShoulders(ohlcData);
    if (headAndShoulders) patterns.push(headAndShoulders);
    
    const ascendingTriangle = this.detectAscendingTriangle(ohlcData);
    if (ascendingTriangle) patterns.push(ascendingTriangle);
    
    return patterns.sort((a, b) => b.confidence - a.confidence); // Sort by confidence
  }
}
