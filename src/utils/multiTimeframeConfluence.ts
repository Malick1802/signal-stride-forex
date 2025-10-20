import { analyzeTimeframeTrend } from './marketStructureAnalysis';
import { AOI } from './supportResistanceZones';

export interface MultiTimeframeAnalysis {
  weekly: 'bullish' | 'bearish' | 'neutral';
  daily: 'bullish' | 'bearish' | 'neutral';
  fourHour: 'bullish' | 'bearish' | 'neutral';
  tradingBias: 'BUY' | 'SELL' | 'NO_TRADE';
  confluenceScore: number;
  alignedTimeframes: string[];
}

interface OHLC {
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  timestamp: string | Date;
}

export async function analyzeMultiTimeframeAlignment(
  supabase: any,
  symbol: string
): Promise<MultiTimeframeAnalysis> {
  
  const weeklyAnalysis = await analyzeTimeframeTrend(supabase, symbol, 'W');
  const dailyAnalysis = await analyzeTimeframeTrend(supabase, symbol, '1D');
  const fourHourAnalysis = await analyzeTimeframeTrend(supabase, symbol, '4H');
  
  const aligned: string[] = [];
  let confluenceScore = 0;
  
  // Require CONSECUTIVE alignment
  if (weeklyAnalysis.trend === dailyAnalysis.trend && weeklyAnalysis.trend !== 'neutral') {
    aligned.push('W+D');
    confluenceScore += 50;
  }
  
  if (dailyAnalysis.trend === fourHourAnalysis.trend && dailyAnalysis.trend !== 'neutral') {
    aligned.push('D+4H');
    confluenceScore += 50;
  }
  
  if (weeklyAnalysis.trend === dailyAnalysis.trend && 
      dailyAnalysis.trend === fourHourAnalysis.trend && 
      weeklyAnalysis.trend !== 'neutral') {
    aligned.push('W+D+4H');
    confluenceScore += 20;
  }
  
  let tradingBias: 'BUY' | 'SELL' | 'NO_TRADE' = 'NO_TRADE';
  
  if (aligned.includes('W+D') || aligned.includes('D+4H')) {
    const dominantTrend = dailyAnalysis.trend;
    tradingBias = dominantTrend === 'bullish' ? 'BUY' : dominantTrend === 'bearish' ? 'SELL' : 'NO_TRADE';
  }
  
  return {
    weekly: weeklyAnalysis.trend,
    daily: dailyAnalysis.trend,
    fourHour: fourHourAnalysis.trend,
    tradingBias,
    confluenceScore,
    alignedTimeframes: aligned
  };
}

export function determineEntryTimeframe(
  multiTF: MultiTimeframeAnalysis,
  weeklyZones: { support: AOI[]; resistance: AOI[] },
  dailyZones: { support: AOI[]; resistance: AOI[] },
  fourHourData: OHLC[]
): '4H' | '1H' | null {
  
  // If W+D clear, use 4H
  if (multiTF.alignedTimeframes.includes('W+D')) {
    return '4H';
  }
  
  // If D+4H but W unclear, check 4H structure confidence
  if (multiTF.alignedTimeframes.includes('D+4H')) {
    return fourHourData.length > 100 ? '4H' : '1H';
  }
  
  return null;
}
