import { StructurePoint } from './marketStructureAnalysis';
import { getPipValue } from './pipCalculator';

export interface HeadAndShouldersPattern {
  patternType: 'bearish_hs' | 'bullish_inverted_hs';
  leftShoulder: { price: number; index: number };
  head: { price: number; index: number };
  rightShoulder: { price: number; index: number };
  necklinePrice: number;
  targetPrice: number;
  isConfirmed: boolean;
  isRetestSetup: boolean;
}

interface OHLC {
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  timestamp: string | Date;
}

interface CandlestickPattern {
  type: string;
  confidence: number;
}

function findLowestBetween(data: OHLC[], startIdx: number, endIdx: number): { price: number; index: number } {
  let lowest = data[startIdx].low_price;
  let lowestIdx = startIdx;
  
  for (let i = startIdx + 1; i <= endIdx && i < data.length; i++) {
    if (data[i].low_price < lowest) {
      lowest = data[i].low_price;
      lowestIdx = i;
    }
  }
  
  return { price: lowest, index: lowestIdx };
}

function findHighestBetween(data: OHLC[], startIdx: number, endIdx: number): { price: number; index: number } {
  let highest = data[startIdx].high_price;
  let highestIdx = startIdx;
  
  for (let i = startIdx + 1; i <= endIdx && i < data.length; i++) {
    if (data[i].high_price > highest) {
      highest = data[i].high_price;
      highestIdx = i;
    }
  }
  
  return { price: highest, index: highestIdx };
}

export function detectHeadAndShoulders(
  ohlcvData: OHLC[],
  currentTrend: 'bullish' | 'bearish',
  structurePoints: StructurePoint[],
  symbol: string = 'EURUSD'
): HeadAndShouldersPattern | null {
  
  if (structurePoints.length < 3) return null;
  
  if (currentTrend === 'bullish') {
    const peaks = structurePoints.filter(p => p.type === 'HH' || p.type === 'LH');
    
    if (peaks.length >= 3) {
      for (let i = 0; i < peaks.length - 2; i++) {
        const left = peaks[i];
        const head = peaks[i + 1];
        const right = peaks[i + 2];
        
        if (head.price > left.price && head.price > right.price) {
          const leftLow = findLowestBetween(ohlcvData, left.index, head.index);
          const rightLow = findLowestBetween(ohlcvData, head.index, right.index);
          
          if (rightLow.price < leftLow.price) {
            const necklinePrice = (leftLow.price + rightLow.price) / 2;
            const headToNeckline = head.price - necklinePrice;
            const targetPrice = necklinePrice - headToNeckline;
            
            const currentPrice = ohlcvData[ohlcvData.length - 1].close_price;
            const isConfirmed = currentPrice < necklinePrice;
            const isRetestSetup = Math.abs(currentPrice - necklinePrice) / getPipValue(symbol) <= 10;
            
            return {
              patternType: 'bearish_hs',
              leftShoulder: { price: left.price, index: left.index },
              head: { price: head.price, index: head.index },
              rightShoulder: { price: right.price, index: right.index },
              necklinePrice,
              targetPrice,
              isConfirmed,
              isRetestSetup
            };
          }
        }
      }
    }
  } else if (currentTrend === 'bearish') {
    const troughs = structurePoints.filter(p => p.type === 'LL' || p.type === 'HL');
    
    if (troughs.length >= 3) {
      for (let i = 0; i < troughs.length - 2; i++) {
        const left = troughs[i];
        const head = troughs[i + 1];
        const right = troughs[i + 2];
        
        if (head.price < left.price && head.price < right.price) {
          const leftHigh = findHighestBetween(ohlcvData, left.index, head.index);
          const rightHigh = findHighestBetween(ohlcvData, head.index, right.index);
          
          if (rightHigh.price > leftHigh.price) {
            const necklinePrice = (leftHigh.price + rightHigh.price) / 2;
            const headToNeckline = necklinePrice - head.price;
            const targetPrice = necklinePrice + headToNeckline;
            
            const currentPrice = ohlcvData[ohlcvData.length - 1].close_price;
            const isConfirmed = currentPrice > necklinePrice;
            const isRetestSetup = Math.abs(currentPrice - necklinePrice) / getPipValue(symbol) <= 10;
            
            return {
              patternType: 'bullish_inverted_hs',
              leftShoulder: { price: left.price, index: left.index },
              head: { price: head.price, index: head.index },
              rightShoulder: { price: right.price, index: right.index },
              necklinePrice,
              targetPrice,
              isConfirmed,
              isRetestSetup
            };
          }
        }
      }
    }
  }
  
  return null;
}

export function isRetestValid(
  pattern: HeadAndShouldersPattern,
  recentCandles: OHLC[],
  candlestickPatterns: CandlestickPattern[]
): boolean {
  
  if (!pattern.isRetestSetup) return false;
  
  const requiredType = pattern.patternType === 'bearish_hs' ? 'bearish' : 'bullish';
  const hasPattern = candlestickPatterns.some(p => p.type === requiredType && p.confidence >= 70);
  
  return hasPattern;
}
