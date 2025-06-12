
export interface TechnicalIndicatorData {
  rsi_14: number;
  macd_line: number;
  macd_signal: number;
  macd_histogram: number;
  bb_upper: number;
  bb_middle: number;
  bb_lower: number;
  ema_50: number;
  ema_200: number;
  atr_14: number;
}

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class TechnicalAnalysis {
  // Calculate RSI (Relative Strength Index)
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Default neutral value
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate subsequent values using smoothing
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change >= 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Calculate EMA (Exponential Moving Average)
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // Calculate MACD (Moving Average Convergence Divergence)
  static calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD)
    const macdValues = [macd]; // Simplified for current implementation
    const signal = this.calculateEMA(macdValues, 9);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  // Calculate Bollinger Bands
  static calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2): { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const currentPrice = prices[prices.length - 1] || 0;
      return { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98 };
    }
    
    const recentPrices = prices.slice(-period);
    const middle = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: middle + (stdDev * multiplier),
      middle,
      lower: middle - (stdDev * multiplier)
    };
  }

  // Calculate ATR (Average True Range)
  static calculateATR(ohlcData: OHLCVData[], period: number = 14): number {
    if (ohlcData.length < 2) return 0;
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < ohlcData.length; i++) {
      const high = ohlcData[i].high;
      const low = ohlcData[i].low;
      const prevClose = ohlcData[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    // Calculate ATR as simple moving average of true ranges
    const startIndex = Math.max(0, trueRanges.length - period);
    const recentTRs = trueRanges.slice(startIndex);
    
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
  }

  // Calculate all technical indicators
  static calculateAllIndicators(ohlcData: OHLCVData[]): TechnicalIndicatorData {
    const closePrices = ohlcData.map(d => d.close);
    
    const rsi = this.calculateRSI(closePrices);
    const macd = this.calculateMACD(closePrices);
    const bb = this.calculateBollingerBands(closePrices);
    const ema50 = this.calculateEMA(closePrices, 50);
    const ema200 = this.calculateEMA(closePrices, 200);
    const atr = this.calculateATR(ohlcData);
    
    return {
      rsi_14: rsi,
      macd_line: macd.macd,
      macd_signal: macd.signal,
      macd_histogram: macd.histogram,
      bb_upper: bb.upper,
      bb_middle: bb.middle,
      bb_lower: bb.lower,
      ema_50: ema50,
      ema_200: ema200,
      atr_14: atr
    };
  }
}
