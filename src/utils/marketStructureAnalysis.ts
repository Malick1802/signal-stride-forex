import { calculateATR } from './technicalAnalysis';

export interface StructurePoint {
  type: 'HH' | 'HL' | 'LH' | 'LL';
  price: number;
  timestamp: Date;
  index: number;
}

export interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'neutral';
  structurePoints: StructurePoint[];
  currentHigh: number;
  currentLow: number;
  lastBreak: 'upside' | 'downside' | null;
  lastUpdate?: string;
}

interface OHLC {
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  timestamp: string | Date;
}

// Identify swing highs/lows (≥0.5 ATR from previous structure point)
export function identifyStructurePoints(
  ohlcvData: OHLC[],
  atr: number,
  symbol: string
): StructurePoint[] {
  const points: StructurePoint[] = [];
  const minDistance = atr * 0.5;
  
  for (let i = 2; i < ohlcvData.length - 2; i++) {
    const current = ohlcvData[i];
    const prev2 = ohlcvData[i - 2];
    const prev1 = ohlcvData[i - 1];
    const next1 = ohlcvData[i + 1];
    const next2 = ohlcvData[i + 2];
    
    // Swing High: Higher than 2 candles before and after
    if (current.high_price > prev2.high_price && 
        current.high_price > prev1.high_price &&
        current.high_price > next1.high_price &&
        current.high_price > next2.high_price) {
      
      if (points.length === 0 || 
          Math.abs(current.high_price - points[points.length - 1].price) >= minDistance) {
        points.push({
          type: 'HH',
          price: current.high_price,
          timestamp: new Date(current.timestamp),
          index: i
        });
      }
    }
    
    // Swing Low: Lower than 2 candles before and after
    if (current.low_price < prev2.low_price && 
        current.low_price < prev1.low_price &&
        current.low_price < next1.low_price &&
        current.low_price < next2.low_price) {
      
      if (points.length === 0 || 
          Math.abs(current.low_price - points[points.length - 1].price) >= minDistance) {
        points.push({
          type: 'LL',
          price: current.low_price,
          timestamp: new Date(current.timestamp),
          index: i
        });
      }
    }
  }
  
  return points;
}

// Classify structure: HH/HL (bullish), LL/LH (bearish)
export function determineMarketStructure(
  structurePoints: StructurePoint[],
  currentPrice: number
): MarketStructure {
  if (structurePoints.length < 4) {
    return {
      trend: 'neutral',
      structurePoints,
      currentHigh: 0,
      currentLow: 0,
      lastBreak: null
    };
  }
  
  const classified = [];
  for (let i = 0; i < structurePoints.length; i++) {
    const point = structurePoints[i];
    
    if (i === 0) {
      classified.push(point);
      continue;
    }
    
    const prevHighs = classified.filter((p, idx) => idx < i && p.price > point.price);
    const prevLows = classified.filter((p, idx) => idx < i && p.price < point.price);
    
    if (point.price > currentPrice * 0.99) {
      if (prevHighs.length > 0 && point.price > Math.max(...prevHighs.map(p => p.price))) {
        point.type = 'HH';
      } else {
        point.type = 'LH';
      }
    } else {
      if (prevLows.length > 0 && point.price > Math.min(...prevLows.map(p => p.price))) {
        point.type = 'HL';
      } else {
        point.type = 'LL';
      }
    }
    
    classified.push(point);
  }
  
  const recent = classified.slice(-4);
  const hhCount = recent.filter(p => p.type === 'HH' || p.type === 'HL').length;
  const llCount = recent.filter(p => p.type === 'LL' || p.type === 'LH').length;
  
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (hhCount >= 3) trend = 'bullish';
  if (llCount >= 3) trend = 'bearish';
  
  const highs = classified.filter(p => p.type === 'HH' || p.type === 'LH');
  const lows = classified.filter(p => p.type === 'LL' || p.type === 'HL');
  
  return {
    trend,
    structurePoints: classified,
    currentHigh: highs.length > 0 ? Math.max(...highs.map(p => p.price)) : 0,
    currentLow: lows.length > 0 ? Math.min(...lows.map(p => p.price)) : 0,
    lastBreak: null
  };
}

// Analyze timeframe trend - Fetches from database
export async function analyzeTimeframeTrend(
  supabase: any,
  symbol: string,
  timeframe: 'W' | 'D' | '4H'
): Promise<{
  trend: 'bullish' | 'bearish' | 'neutral';
  structure: MarketStructure;
  confidence: number;
}> {
  const { data: trendData, error } = await supabase
    .from('market_structure_trends')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .single();
  
  if (error || !trendData) {
    return { trend: 'neutral', structure: null as any, confidence: 0 };
  }
  
  const structure: MarketStructure = {
    trend: trendData.trend,
    structurePoints: trendData.structure_points || [],
    currentHigh: trendData.current_hh || 0,
    currentLow: trendData.current_ll || 0,
    lastBreak: null,
    lastUpdate: trendData.last_updated
  };
  
  return { trend: trendData.trend, structure, confidence: trendData.confidence || 0 };
}
