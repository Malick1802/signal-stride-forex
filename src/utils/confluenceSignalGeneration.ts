import { StructurePoint, MarketStructure } from './marketStructureAnalysis';
import { AOI } from './supportResistanceZones';
import { MultiTimeframeAnalysis } from './multiTimeframeConfluence';
import { HeadAndShouldersPattern } from './headAndShouldersDetection';
import { getPipValue } from './pipCalculator';

export interface GeneratedSignal {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  stop_loss: number;
  take_profits: number[];
  confidence: number;
  strategy_type: 'trend_continuation' | 'head_and_shoulders_reversal' | 'confluence_reversal';
  entry_timeframe: '4H' | '1H';
  timeframe_confluence: {
    weekly: 'bullish' | 'bearish' | 'neutral';
    daily: 'bullish' | 'bearish' | 'neutral';
    fourHour: 'bullish' | 'bearish' | 'neutral';
    aligned: string[];
  };
  aoi_zones?: {
    support: AOI[];
    resistance: AOI[];
  };
  structure_points: StructurePoint[];
  pattern_detected?: string;
  pattern_confidence?: number;
}

export interface SignalInput {
  symbol: string;
  currentPrice: number;
  multiTF: MultiTimeframeAnalysis;
  fourHourStructure: MarketStructure;
  weeklyZones: { support: AOI[]; resistance: AOI[] };
  dailyZones: { support: AOI[]; resistance: AOI[] };
  overlappingZones: { support: AOI[]; resistance: AOI[]; bonusScore: number };
  entryTimeframe: '4H' | '1H';
  atAOI: boolean;
  ema50Bonus?: number;
  candlestickBonus?: number;
  aoiBonus?: number;
}

export function calculateStopLoss(
  entryPrice: number,
  signalType: 'BUY' | 'SELL',
  structurePoint: StructurePoint,
  symbol: string,
  buffer: number = 10
): number {
  const pipValue = getPipValue(symbol);
  const bufferPrice = buffer * pipValue;
  
  if (signalType === 'BUY') {
    return structurePoint.price - bufferPrice;
  } else {
    return structurePoint.price + bufferPrice;
  }
}

export function calculateTakeProfits(
  entryPrice: number,
  stopLoss: number,
  signalType: 'BUY' | 'SELL',
  structurePoints: StructurePoint[],
  zones: { support: AOI[]; resistance: AOI[] },
  symbol: string
): number[] {
  
  const minRRR = 2.0;
  const riskPips = Math.abs(entryPrice - stopLoss) / getPipValue(symbol);
  const minRewardPips = riskPips * minRRR;
  
  const takeProfits: number[] = [];
  
  if (signalType === 'BUY') {
    const targets = [
      ...zones.resistance.map(z => z.priceLevel),
      ...structurePoints.filter(p => p.type === 'HH' || p.type === 'LH').map(p => p.price)
    ].filter(price => price > entryPrice).sort((a, b) => a - b);
    
    for (const target of targets) {
      const rewardPips = (target - entryPrice) / getPipValue(symbol);
      if (rewardPips >= minRewardPips) {
        takeProfits.push(target);
        if (takeProfits.length === 3) break;
      }
    }
  } else {
    const targets = [
      ...zones.support.map(z => z.priceLevel),
      ...structurePoints.filter(p => p.type === 'LL' || p.type === 'HL').map(p => p.price)
    ].filter(price => price < entryPrice).sort((a, b) => b - a);
    
    for (const target of targets) {
      const rewardPips = (entryPrice - target) / getPipValue(symbol);
      if (rewardPips >= minRewardPips) {
        takeProfits.push(target);
        if (takeProfits.length === 3) break;
      }
    }
  }
  
  return takeProfits;
}

export function generateTrendContinuationSignal(input: SignalInput): GeneratedSignal | null {
  if (!input.atAOI) return null;
  if (input.multiTF.confluenceScore < 40) return null;
  if (input.multiTF.tradingBias === 'NO_TRADE') return null;
  
  const relevantStructure = input.multiTF.tradingBias === 'BUY' 
    ? input.fourHourStructure.structurePoints.filter(p => p.type === 'HL').slice(-1)[0]
    : input.fourHourStructure.structurePoints.filter(p => p.type === 'LH').slice(-1)[0];
  
  if (!relevantStructure) return null;
  
  const stopLoss = calculateStopLoss(
    input.currentPrice,
    input.multiTF.tradingBias as 'BUY' | 'SELL',
    relevantStructure,
    input.symbol
  );
  
  const takeProfits = calculateTakeProfits(
    input.currentPrice,
    stopLoss,
    input.multiTF.tradingBias as 'BUY' | 'SELL',
    input.fourHourStructure.structurePoints,
    { 
      support: [...input.weeklyZones.support, ...input.dailyZones.support],
      resistance: [...input.weeklyZones.resistance, ...input.dailyZones.resistance] 
    },
    input.symbol
  );
  
  if (takeProfits.length === 0) return null;
  
  let confidence = input.multiTF.confluenceScore;
  if (input.ema50Bonus) confidence += input.ema50Bonus;
  if (input.candlestickBonus) confidence += input.candlestickBonus;
  if (input.overlappingZones.bonusScore > 0) confidence += 10;
  
  return {
    symbol: input.symbol,
    type: input.multiTF.tradingBias as 'BUY' | 'SELL',
    price: input.currentPrice,
    stop_loss: stopLoss,
    take_profits: takeProfits,
    confidence: Math.min(95, confidence),
    strategy_type: 'trend_continuation',
    entry_timeframe: input.entryTimeframe,
    timeframe_confluence: {
      weekly: input.multiTF.weekly,
      daily: input.multiTF.daily,
      fourHour: input.multiTF.fourHour,
      aligned: input.multiTF.alignedTimeframes
    },
    aoi_zones: {
      support: input.weeklyZones.support.concat(input.dailyZones.support),
      resistance: input.weeklyZones.resistance.concat(input.dailyZones.resistance)
    },
    structure_points: input.fourHourStructure.structurePoints
  };
}

export function generateHeadAndShouldersSignal(
  input: SignalInput,
  hsPattern: HeadAndShouldersPattern
): GeneratedSignal | null {
  
  if (!hsPattern.isConfirmed) return null;
  
  const stopLoss = hsPattern.patternType === 'bearish_hs'
    ? hsPattern.rightShoulder.price + (10 * getPipValue(input.symbol))
    : hsPattern.rightShoulder.price - (10 * getPipValue(input.symbol));
  
  const takeProfits = [hsPattern.targetPrice];
  
  let confidence = 70;
  if (input.aoiBonus) confidence += input.aoiBonus;
  if (input.ema50Bonus) confidence += input.ema50Bonus;
  if (input.candlestickBonus) confidence += input.candlestickBonus;
  
  return {
    symbol: input.symbol,
    type: hsPattern.patternType === 'bearish_hs' ? 'SELL' : 'BUY',
    price: input.currentPrice,
    stop_loss: stopLoss,
    take_profits: takeProfits,
    confidence: Math.min(95, confidence),
    strategy_type: input.aoiBonus && input.aoiBonus > 0 ? 'confluence_reversal' : 'head_and_shoulders_reversal',
    entry_timeframe: input.entryTimeframe,
    pattern_detected: hsPattern.patternType,
    pattern_confidence: confidence,
    timeframe_confluence: {
      weekly: input.multiTF.weekly,
      daily: input.multiTF.daily,
      fourHour: input.multiTF.fourHour,
      aligned: input.multiTF.alignedTimeframes
    },
    structure_points: input.fourHourStructure.structurePoints
  };
}
