import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============= UTILITY FUNCTIONS =============

function isJPYPair(symbol: string): boolean {
  return symbol.includes('JPY');
}

function getPipValue(symbol: string): number {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
}

function calculatePips(entryPrice: number, targetPrice: number, signalType: 'BUY' | 'SELL', symbol: string): number {
  const pipValue = getPipValue(symbol);
  let priceDiff: number;
  
  if (signalType === 'BUY') {
    priceDiff = targetPrice - entryPrice;
  } else {
    priceDiff = entryPrice - targetPrice;
  }
  
  return Math.round(priceDiff / pipValue);
}

function calculateATR(data: any[], period: number = 14): number {
  if (data.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high_price;
    const low = data[i].low_price;
    const prevClose = data[i - 1].close_price;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
}

function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  ema[0] = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema[i] = (values[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

// ============= STRUCTURE ANALYSIS =============

interface StructurePoint {
  type: 'HH' | 'HL' | 'LH' | 'LL';
  price: number;
  timestamp: Date;
  index: number;
}

interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'neutral';
  structurePoints: StructurePoint[];
  currentHigh: number;
  currentLow: number;
  lastBreak: 'upside' | 'downside' | null;
}

function identifyStructurePoints(ohlcvData: any[], atr: number, symbol: string): StructurePoint[] {
  const points: StructurePoint[] = [];
  const minDistance = atr * 0.5;
  
  for (let i = 2; i < ohlcvData.length - 2; i++) {
    const current = ohlcvData[i];
    const prev2 = ohlcvData[i - 2];
    const prev1 = ohlcvData[i - 1];
    const next1 = ohlcvData[i + 1];
    const next2 = ohlcvData[i + 2];
    
    // Swing High
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
    
    // Swing Low
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

function determineMarketStructure(structurePoints: StructurePoint[], currentPrice: number): MarketStructure {
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

async function analyzeTimeframeTrend(
  supabase: any,
  symbol: string,
  timeframe: 'W' | 'D' | '4H'
): Promise<{
  trend: 'bullish' | 'bearish' | 'neutral';
  structure: MarketStructure;
  confidence: number;
}> {
  // Fetch pre-calculated trend from database
  const { data: trendData, error } = await supabase
    .from('market_structure_trends')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .single();
  
  if (error || !trendData) {
    console.error(`No trend data for ${symbol} ${timeframe}`);
    return { trend: 'neutral', structure: null as any, confidence: 0 };
  }
  
  // Normalize structure_points: map swing_high → HH, swing_low → LL
  const normalizedPoints = (trendData.structure_points || []).map((p: any) => {
    let normalizedType = p.type;
    
    // Use label if it's a valid structure type (HH, HL, LH, LL)
    if (p.label && ['HH', 'HL', 'LH', 'LL'].includes(p.label)) {
      normalizedType = p.label;
    } else if (p.type === 'swing_high') {
      normalizedType = 'HH';
    } else if (p.type === 'swing_low') {
      normalizedType = 'LL';
    }
    
    return {
      type: normalizedType,
      price: p.price,
      timestamp: new Date(p.timestamp),
      index: p.index
    };
  });
  
  const structure: MarketStructure = {
    trend: trendData.trend,
    structurePoints: normalizedPoints,
    currentHigh: trendData.current_hh || 0,
    currentLow: trendData.current_ll || 0,
    lastBreak: null
  };
  
  return { trend: trendData.trend, structure, confidence: trendData.confidence || 0 };
}

// ============= MULTI-TIMEFRAME CONFLUENCE =============

interface MultiTimeframeAnalysis {
  weekly: 'bullish' | 'bearish' | 'neutral';
  daily: 'bullish' | 'bearish' | 'neutral';
  fourHour: 'bullish' | 'bearish' | 'neutral';
  tradingBias: 'BUY' | 'SELL' | 'NO_TRADE';
  confluenceScore: number;
  alignedTimeframes: string[];
}

async function analyzeMultiTimeframeAlignment(supabase: any, symbol: string): Promise<MultiTimeframeAnalysis> {
  const weeklyAnalysis = await analyzeTimeframeTrend(supabase, symbol, 'W');
  const dailyAnalysis = await analyzeTimeframeTrend(supabase, symbol, 'D');
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

// ============= SUPPORT/RESISTANCE ZONES =============

interface AOI {
  type: 'support' | 'resistance';
  priceLevel: number;
  width: number;
  strength: number;
  touchPoints: number;
}

function clusterStructurePoints(structurePoints: StructurePoint[], symbol: string): AOI[] {
  const pipValue = getPipValue(symbol);
  const zones: AOI[] = [];
  const sorted = [...structurePoints].sort((a, b) => a.price - b.price);
  
  let currentZone: StructurePoint[] = [];
  
  for (const point of sorted) {
    if (currentZone.length === 0) {
      currentZone.push(point);
      continue;
    }
    
    const zoneMin = Math.min(...currentZone.map(p => p.price));
    const zoneMax = Math.max(...currentZone.map(p => p.price));
    const newMax = Math.max(zoneMax, point.price);
    const newMin = Math.min(zoneMin, point.price);
    const newPips = (newMax - newMin) / pipValue;
    
    if (newPips <= 60) {
      currentZone.push(point);
    } else {
      if (currentZone.length >= 3) {
        zones.push(createAOI(currentZone, symbol));
      }
      currentZone = [point];
    }
  }
  
  if (currentZone.length >= 3) {
    zones.push(createAOI(currentZone, symbol));
  }
  
  return zones;
}

function createAOI(points: StructurePoint[], symbol: string): AOI {
  const prices = points.map(p => p.price);
  const priceLevel = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const width = (Math.max(...prices) - Math.min(...prices)) / getPipValue(symbol);
  
  let strength = Math.min(5, points.length);
  if (width <= 25) strength = Math.min(5, strength + 1);
  
  return {
    type: points[0].type === 'LL' || points[0].type === 'HL' ? 'support' : 'resistance',
    priceLevel,
    width,
    strength,
    touchPoints: points.length
  };
}

function findZoneOverlaps(weeklyZones: { support: AOI[]; resistance: AOI[] }, dailyZones: { support: AOI[]; resistance: AOI[] }, symbol: string): {
  support: AOI[];
  resistance: AOI[];
  bonusScore: number;
} {
  const overlappingSupport: AOI[] = [];
  const overlappingResistance: AOI[] = [];
  
  for (const wZone of weeklyZones.support) {
    for (const dZone of dailyZones.support) {
      const pipDiff = Math.abs(wZone.priceLevel - dZone.priceLevel) / getPipValue(symbol);
      
      if (pipDiff <= 10) {
        overlappingSupport.push({
          ...wZone,
          strength: Math.min(5, wZone.strength + 1),
          touchPoints: wZone.touchPoints + dZone.touchPoints
        });
      }
    }
  }
  
  for (const wZone of weeklyZones.resistance) {
    for (const dZone of dailyZones.resistance) {
      const pipDiff = Math.abs(wZone.priceLevel - dZone.priceLevel) / getPipValue(symbol);
      
      if (pipDiff <= 10) {
        overlappingResistance.push({
          ...wZone,
          strength: Math.min(5, wZone.strength + 1),
          touchPoints: wZone.touchPoints + dZone.touchPoints
        });
      }
    }
  }
  
  const bonusScore = (overlappingSupport.length + overlappingResistance.length) * 10;
  
  return { support: overlappingSupport, resistance: overlappingResistance, bonusScore };
}

// ============= SIGNAL GENERATION =============

function calculateStopLoss(entryPrice: number, signalType: 'BUY' | 'SELL', structurePoint: StructurePoint, symbol: string, buffer: number = 10): number {
  const pipValue = getPipValue(symbol);
  const bufferPrice = buffer * pipValue;
  
  if (signalType === 'BUY') {
    return structurePoint.price - bufferPrice;
  } else {
    return structurePoint.price + bufferPrice;
  }
}

function calculateTakeProfits(
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

function checkIfPriceAtAOI(currentPrice: number, tradingBias: 'BUY' | 'SELL', weeklyZones: any, dailyZones: any, symbol: string): boolean {
  const pipValue = getPipValue(symbol);
  const threshold = 15 * pipValue;
  
  if (tradingBias === 'BUY') {
    const allSupport = [...weeklyZones.support, ...dailyZones.support];
    return allSupport.some(zone => Math.abs(currentPrice - zone.priceLevel) <= threshold);
  } else {
    const allResistance = [...weeklyZones.resistance, ...dailyZones.resistance];
    return allResistance.some(zone => Math.abs(currentPrice - zone.priceLevel) <= threshold);
  }
}

// Head & Shoulders pattern detection
function detectHeadAndShoulders(
  ohlcvData: any[],
  currentTrend: 'bullish' | 'bearish',
  structurePoints: StructurePoint[],
  symbol: string
): any | null {
  if (structurePoints.length < 3) return null;
  
  const findLowestBetween = (data: any[], startIdx: number, endIdx: number) => {
    // Add defensive bounds checking
    const safeStart = Math.max(0, Math.min(startIdx, data.length - 1));
    const safeEnd = Math.max(0, Math.min(endIdx, data.length - 1));
    
    if (safeStart >= data.length || safeEnd >= data.length || safeStart >= safeEnd) {
      return { price: 0, index: -1 }; // Invalid range
    }
    
    if (!data[safeStart] || data[safeStart].low_price === undefined) {
      return { price: 0, index: -1 }; // Invalid data
    }
    
    let lowest = data[safeStart].low_price;
    let lowestIdx = safeStart;
    
    for (let i = safeStart + 1; i <= safeEnd; i++) {
      if (!data[i] || data[i].low_price === undefined) continue; // Skip invalid data
      if (data[i].low_price < lowest) {
        lowest = data[i].low_price;
        lowestIdx = i;
      }
    }
    return { price: lowest, index: lowestIdx };
  };
  
  const findHighestBetween = (data: any[], startIdx: number, endIdx: number) => {
    // Add defensive bounds checking
    const safeStart = Math.max(0, Math.min(startIdx, data.length - 1));
    const safeEnd = Math.max(0, Math.min(endIdx, data.length - 1));
    
    if (safeStart >= data.length || safeEnd >= data.length || safeStart >= safeEnd) {
      return { price: 0, index: -1 }; // Invalid range
    }
    
    if (!data[safeStart] || data[safeStart].high_price === undefined) {
      return { price: 0, index: -1 }; // Invalid data
    }
    
    let highest = data[safeStart].high_price;
    let highestIdx = safeStart;
    
    for (let i = safeStart + 1; i <= safeEnd; i++) {
      if (!data[i] || data[i].high_price === undefined) continue; // Skip invalid data
      if (data[i].high_price > highest) {
        highest = data[i].high_price;
        highestIdx = i;
      }
    }
    return { price: highest, index: highestIdx };
  };
  
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
            
            return {
              patternType: 'bearish_hs',
              leftShoulder: { price: left.price, index: left.index },
              head: { price: head.price, index: head.index },
              rightShoulder: { price: right.price, index: right.index },
              necklinePrice,
              targetPrice,
              isConfirmed
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
            
            return {
              patternType: 'bullish_inverted_hs',
              leftShoulder: { price: left.price, index: left.index },
              head: { price: head.price, index: head.index },
              rightShoulder: { price: right.price, index: right.index },
              necklinePrice,
              targetPrice,
              isConfirmed
            };
          }
        }
      }
    }
  }
  
  return null;
}

// Get confluence threshold based on level
function getConfluenceThreshold(level: string): number {
  const thresholds: Record<string, number> = {
    'EXTREME': 75,
    'ULTRA': 70,
    'HIGH': 65,
    'MEDIUM': 60,
    'LOW': 55
  };
  return thresholds[level] || 55;
}

// Get AOI threshold based on level
function getAOIThreshold(level: string, symbol: string): number {
  const pipValue = getPipValue(symbol);
  const thresholds: Record<string, number> = {
    'EXTREME': 5,
    'ULTRA': 7,
    'HIGH': 10,
    'MEDIUM': 15,
    'LOW': 20
  };
  return (thresholds[level] || 20) * pipValue;
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  const startTime = Date.now();
  console.log(`🚀 Dual-Strategy Signal Generation - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get admin settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('entry_threshold, ai_validation_enabled')
      .eq('singleton', true)
      .single();
    
    const thresholdLevel = settings?.entry_threshold || 'LOW';
    const aiValidationEnabled = settings?.ai_validation_enabled === 'true';
    const confluenceThreshold = getConfluenceThreshold(thresholdLevel);
    
    console.log(`⚙️ Settings: Threshold=${thresholdLevel} (${confluenceThreshold}), AI=${aiValidationEnabled}`);
    
    const symbols = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
      'EURGBP', 'GBPCAD', 'EURAUD', 'EURCAD', 'GBPAUD', 'CHFJPY', 'NZDJPY',
      'GBPNZD', 'AUDCHF', 'CADJPY', 'NZDCHF', 'NZDCAD', 'AUDNZD', 'AUDJPY',
      'EURNZD', 'EURJPY', 'CADCHF', 'EURCHF', 'GBPCHF', 'GBPJPY'
    ];
    
    const candidateSignals = [];
    let trendContinuationCount = 0;
    let headAndShouldersCount = 0;
    let belowThresholdCount = 0;
    
    // === TIER 1: STRUCTURE-BASED ANALYSIS ===
    for (const symbol of symbols) {
      try {
        console.log(`🎯 Analyzing ${symbol}...`);
        
        // 1. Multi-timeframe structure analysis
        const weeklyAnalysis = await analyzeTimeframeTrend(supabase, symbol, 'W', 50);
        const dailyAnalysis = await analyzeTimeframeTrend(supabase, symbol, 'D', 50);
        const fourHourAnalysis = await analyzeTimeframeTrend(supabase, symbol, '4H', 50);
        
        // 1.1 Null safety check for structure data
        if (!weeklyAnalysis?.structure || !dailyAnalysis?.structure || !fourHourAnalysis?.structure) {
          console.log(`❌ ${symbol}: Missing trend data (W:${!!weeklyAnalysis?.structure} D:${!!dailyAnalysis?.structure} 4H:${!!fourHourAnalysis?.structure})`);
          continue;
        }
        
        // 2. Check multi-timeframe confluence
        const multiTF = await analyzeMultiTimeframeAlignment(supabase, symbol);
        if (multiTF.tradingBias === 'NO_TRADE') {
          console.log(`❌ ${symbol}: No multi-TF confluence`);
          continue;
        }
        
        // 2.1 NEW: Require Daily AND 4H to align for high-quality signals
        if (dailyAnalysis.trend !== fourHourAnalysis.trend) {
          console.log(`❌ ${symbol}: D/4H trend mismatch (D:${dailyAnalysis.trend}, 4H:${fourHourAnalysis.trend}) - skipping for quality`);
          continue;
        }
        
        console.log(`📊 ${symbol}: D=${dailyAnalysis.trend} (${dailyAnalysis.confidence}%), 4H=${fourHourAnalysis.trend} (${fourHourAnalysis.confidence}%) → Bias: ${multiTF.tradingBias}`);
        
        // 3. Identify AOI zones
        const weeklyZones = {
          support: clusterStructurePoints(weeklyAnalysis.structure.structurePoints.filter(p => p.type === 'LL' || p.type === 'HL'), symbol),
          resistance: clusterStructurePoints(weeklyAnalysis.structure.structurePoints.filter(p => p.type === 'HH' || p.type === 'LH'), symbol)
        };
        
        const dailyZones = {
          support: clusterStructurePoints(dailyAnalysis.structure.structurePoints.filter(p => p.type === 'LL' || p.type === 'HL'), symbol),
          resistance: clusterStructurePoints(dailyAnalysis.structure.structurePoints.filter(p => p.type === 'HH' || p.type === 'LH'), symbol)
        };
        
        const overlappingZones = findZoneOverlaps(weeklyZones, dailyZones, symbol);
        
        // 4. Get current market data & 4H OHLCV for pattern detection
        const { data: currentMarket } = await supabase
          .from('centralized_market_state')
          .select('*')
          .eq('symbol', symbol)
          .single();
        
        if (!currentMarket) continue;
        const currentPrice = currentMarket.current_price;
        
        const { data: fourHourOHLCV } = await supabase
          .from('multi_timeframe_data')
          .select('*')
          .eq('symbol', symbol)
          .eq('timeframe', '4H')
          .order('timestamp', { ascending: true })
          .limit(100);
        
        // 5. Check for Head & Shoulders pattern
        // Look for H&S forming at END of opposite trend (reversal into MTF bias)
        const hsDetectionTrend = multiTF.tradingBias === 'BUY' ? 'bearish' : 'bullish';
        
        const hsPattern = fourHourOHLCV && fourHourOHLCV.length >= 50 && fourHourAnalysis?.structure
          ? detectHeadAndShoulders(
              fourHourOHLCV,
              hsDetectionTrend, // Pass opposite trend to detect reversal
              fourHourAnalysis.structure.structurePoints,
              symbol
            )
          : null;
        
        // 6. Validate AOI proximity
        const aoiThreshold = getAOIThreshold(thresholdLevel, symbol);
        const atAOI = multiTF.tradingBias === 'BUY'
          ? [...weeklyZones.support, ...dailyZones.support].some(z => Math.abs(currentPrice - z.priceLevel) <= aoiThreshold)
          : [...weeklyZones.resistance, ...dailyZones.resistance].some(z => Math.abs(currentPrice - z.priceLevel) <= aoiThreshold);
        
        // 7. HEAD & SHOULDERS SIGNAL (Priority)
        if (hsPattern && hsPattern.isConfirmed) {
          const hsSignalType = hsPattern.patternType === 'bearish_hs' ? 'SELL' : 'BUY';
          
          // CRITICAL: Validate H&S direction matches multi-timeframe bias
          if (hsSignalType !== multiTF.tradingBias) {
            console.log(`❌ ${symbol}: H&S direction (${hsSignalType}) conflicts with MTF bias (${multiTF.tradingBias}) - SKIPPING`);
            continue;
          }
          
          console.log(`✅ ${symbol}: ${hsPattern.patternType} aligned with ${multiTF.tradingBias} bias`);
          
          const stopLoss = hsPattern.patternType === 'bearish_hs'
            ? hsPattern.rightShoulder.price + (10 * getPipValue(symbol))
            : hsPattern.rightShoulder.price - (10 * getPipValue(symbol));
          
          const takeProfits = [hsPattern.targetPrice];
          
          let hsConfidence = 65; // Base H&S confidence
          if (atAOI) hsConfidence += 10;
          if (overlappingZones.bonusScore > 0) hsConfidence += 5;
          
          // Apply threshold filter
          if (hsConfidence < confluenceThreshold) {
            belowThresholdCount++;
            console.log(`❌ ${symbol}: H&S confidence ${hsConfidence} below threshold ${confluenceThreshold}`);
            continue;
          }
          
          const signal = {
            symbol,
            type: hsSignalType,
            price: currentPrice,
            stop_loss: stopLoss,
            take_profits: takeProfits,
            confidence: Math.min(95, hsConfidence),
            strategy_type: atAOI ? 'confluence_reversal' : 'head_and_shoulders_reversal',
            entry_timeframe: '4H' as const,
            pattern_detected: hsPattern.patternType,
            pattern_confidence: hsConfidence,
            timeframe_confluence: {
              weekly: multiTF.weekly,
              daily: multiTF.daily,
              fourHour: multiTF.fourHour,
              aligned: multiTF.alignedTimeframes
            },
            aoi_zones: {
              support: weeklyZones.support.concat(dailyZones.support).map(z => ({
                priceLevel: z.priceLevel,
                width: z.width,
                strength: z.strength
              })),
              resistance: weeklyZones.resistance.concat(dailyZones.resistance).map(z => ({
                priceLevel: z.priceLevel,
                width: z.width,
                strength: z.strength
              }))
            },
            structure_points: fourHourAnalysis.structure.structurePoints.map(p => ({
              type: p.type,
              price: p.price,
              timestamp: new Date(p.timestamp).toISOString()
            }))
          };
          
          candidateSignals.push(signal);
          headAndShouldersCount++;
          console.log(`✅ ${symbol}: H&S ${hsPattern.patternType} signal (${hsConfidence}%)`);
          continue;
        }
        
        // 8. TREND CONTINUATION SIGNAL (if no H&S)
        if (!atAOI && (thresholdLevel === 'HIGH' || thresholdLevel === 'EXTREME' || thresholdLevel === 'ULTRA')) {
          console.log(`❌ ${symbol}: Not at AOI (${thresholdLevel} threshold requires retest)`);
          continue;
        }
        
        // Diagnostic: Log structure point counts for debugging
        const hlCount = fourHourAnalysis.structure.structurePoints.filter(p => p.type === 'HL').length;
        const lhCount = fourHourAnalysis.structure.structurePoints.filter(p => p.type === 'LH').length;
        console.log(`🔍 ${symbol} 4H structure: ${hlCount} HL, ${lhCount} LH (bias: ${multiTF.tradingBias})`);
        
        const relevantStructure = multiTF.tradingBias === 'BUY' 
          ? fourHourAnalysis.structure.structurePoints.filter(p => p.type === 'HL').slice(-1)[0]
          : fourHourAnalysis.structure.structurePoints.filter(p => p.type === 'LH').slice(-1)[0];
        
        if (!relevantStructure) {
          const allTypes = fourHourAnalysis.structure.structurePoints.map(p => p.type).slice(-5);
          console.log(`❌ ${symbol}: No relevant structure point for SL (last 5 types: ${allTypes.join(', ')})`);
          continue;
        }
        
        const stopLoss = calculateStopLoss(currentPrice, multiTF.tradingBias, relevantStructure, symbol);
        
        const takeProfits = calculateTakeProfits(
          currentPrice,
          stopLoss,
          multiTF.tradingBias,
          fourHourAnalysis.structure.structurePoints,
          { 
            support: [...weeklyZones.support, ...dailyZones.support],
            resistance: [...weeklyZones.resistance, ...dailyZones.resistance] 
          },
          symbol
        );
        
        if (takeProfits.length === 0) {
          console.log(`❌ ${symbol}: No valid take profits (min RRR not met)`);
          continue;
        }
        
        let confidence = multiTF.confluenceScore;
        if (overlappingZones.bonusScore > 0) confidence += 10;
        if (atAOI) confidence += 5;
        
        // Apply threshold filter
        if (confidence < confluenceThreshold) {
          belowThresholdCount++;
          console.log(`❌ ${symbol}: Confidence ${confidence} below threshold ${confluenceThreshold}`);
          continue;
        }
        
        const signal = {
          symbol,
          type: multiTF.tradingBias,
          price: currentPrice,
          stop_loss: stopLoss,
          take_profits: takeProfits,
          confidence: Math.min(95, confidence),
          strategy_type: 'trend_continuation',
          entry_timeframe: '4H' as const,
          timeframe_confluence: {
            weekly: multiTF.weekly,
            daily: multiTF.daily,
            fourHour: multiTF.fourHour,
            aligned: multiTF.alignedTimeframes
          },
          aoi_zones: {
            support: weeklyZones.support.concat(dailyZones.support).map(z => ({
              priceLevel: z.priceLevel,
              width: z.width,
              strength: z.strength
            })),
            resistance: weeklyZones.resistance.concat(dailyZones.resistance).map(z => ({
              priceLevel: z.priceLevel,
              width: z.width,
              strength: z.strength
            }))
          },
          structure_points: fourHourAnalysis.structure.structurePoints.map(p => ({
            type: p.type,
            price: p.price,
            timestamp: new Date(p.timestamp).toISOString()
          }))
        };
        
        candidateSignals.push(signal);
        trendContinuationCount++;
        console.log(`✅ ${symbol}: Trend Continuation ${signal.type} (${confidence}%)`);
        
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log(`\n📊 TIER 1 SUMMARY:`);
    console.log(`  - Symbols analyzed: ${symbols.length}`);
    console.log(`  - Trend Continuation: ${trendContinuationCount}`);
    console.log(`  - Head & Shoulders: ${headAndShouldersCount}`);
    console.log(`  - Below threshold: ${belowThresholdCount}`);
    console.log(`  - Total candidates: ${candidateSignals.length}`);
    
    // === TIER 2: AI VALIDATION (if enabled) ===
    let finalSignals = candidateSignals;
    let aiRejectedCount = 0;
    let aiTokensUsed = 0;
    
    if (aiValidationEnabled && candidateSignals.length > 0) {
      console.log(`\n🤖 TIER 2: AI Validation for ${candidateSignals.length} signals...`);
      finalSignals = [];
      
      for (const signal of candidateSignals) {
        try {
          const { data: validation, error: aiError } = await supabase.functions.invoke('validate-signal-with-ai', {
            body: { signal }
          });
          
          if (aiError) {
            console.error(`⚠️ AI error for ${signal.symbol}:`, aiError);
            finalSignals.push(signal); // Include on error
            continue;
          }
          
          if (validation?.approved) {
            const blendedConfidence = Math.round((signal.confidence * 0.6) + (validation.confidence * 0.4));
            
            finalSignals.push({
              ...signal,
              confidence: blendedConfidence,
              analysis_text: validation.analysis,
              ai_validated: true,
              ai_confidence: validation.confidence,
              structure_confidence: signal.confidence
            });
            
            if (validation.tokens_used) aiTokensUsed += validation.tokens_used;
            console.log(`✅ AI approved: ${signal.symbol} (Struct: ${signal.confidence}%, AI: ${validation.confidence}%, Final: ${blendedConfidence}%)`);
          } else {
            aiRejectedCount++;
            console.log(`❌ AI rejected: ${signal.symbol} - ${validation?.rejection_reason || 'Unknown reason'}`);
          }
        } catch (error) {
          console.error(`❌ AI validation error for ${signal.symbol}:`, error);
          finalSignals.push(signal); // Include on error
        }
      }
      
      console.log(`\n📊 TIER 2 SUMMARY:`);
      console.log(`  - Approved: ${finalSignals.length}`);
      console.log(`  - Rejected: ${aiRejectedCount}`);
      console.log(`  - Tokens used: ${aiTokensUsed}`);
    }
    
    // === INSERT APPROVED SIGNALS ===
    if (finalSignals.length > 0) {
      const signalsToInsert = finalSignals.map(s => ({
        symbol: s.symbol,
        type: s.type,
        price: s.price,
        stop_loss: s.stop_loss,
        take_profits: s.take_profits,
        confidence: s.confidence,
        analysis_text: s.analysis_text || `${s.strategy_type} - ${s.timeframe_confluence.aligned.join(', ')}`,
        timestamp: new Date().toISOString(),
        status: 'active',
        is_centralized: true,
        user_id: null,
        strategy_type: s.strategy_type,
        entry_timeframe: s.entry_timeframe,
        timeframe_confluence: s.timeframe_confluence,
        aoi_zones: s.aoi_zones,
        structure_points: s.structure_points,
        pattern_detected: s.pattern_detected || null,
        pattern_confidence: s.pattern_confidence || null,
        ai_validated: s.ai_validated || false,
        ai_confidence: s.ai_confidence || null,
        structure_confidence: s.structure_confidence || s.confidence
      }));
      
      const { data: insertedSignals, error: insertError } = await supabase
        .from('trading_signals')
        .insert(signalsToInsert)
        .select('id');
      
      if (insertError) {
        console.error('❌ Error inserting signals:', insertError);
      } else {
        console.log(`✅ Inserted ${finalSignals.length} signals into database`);
        
        // Store AI analysis if available
        for (let i = 0; i < finalSignals.length; i++) {
          const signal = finalSignals[i];
          if (signal.ai_validated && signal.analysis_text && insertedSignals && insertedSignals[i]) {
            await supabase.from('ai_analysis').insert({
              signal_id: insertedSignals[i].id,
              analysis_text: signal.analysis_text,
              confidence_score: signal.ai_confidence,
              market_conditions: signal.timeframe_confluence
            });
          }
        }
      }
    }
    
    // === LOG INVOCATION METRICS ===
    await supabase.from('function_invocations').insert({
      function_name: 'generate-signals',
      pairs_analyzed: symbols.length,
      tier1_distribution: {
        trend_continuation: trendContinuationCount,
        head_and_shoulders: headAndShouldersCount,
        below_threshold: belowThresholdCount
      },
      tier2_escalated: aiValidationEnabled ? candidateSignals.length : 0,
      tier3_reached: aiValidationEnabled ? finalSignals.length : candidateSignals.length,
      tokens_used: aiTokensUsed,
      execution_time_ms: executionTime,
      success: true,
      source: 'automated'
    });
    
    console.log(`\n✅ GENERATION COMPLETE in ${executionTime}ms\n`);
    
    return new Response(JSON.stringify({
      success: true,
      execution_time_ms: executionTime,
      tier1_candidates: candidateSignals.length,
      tier1_breakdown: {
        trend_continuation: trendContinuationCount,
        head_and_shoulders: headAndShouldersCount,
        below_threshold: belowThresholdCount
      },
      tier2_approved: finalSignals.length,
      tier2_rejected: aiRejectedCount,
      ai_validation_enabled: aiValidationEnabled,
      threshold_level: thresholdLevel,
      confluence_threshold: confluenceThreshold,
      tokens_used: aiTokensUsed,
      signals: finalSignals.map(s => ({
        symbol: s.symbol,
        type: s.type,
        confidence: s.confidence,
        strategy_type: s.strategy_type,
        pattern: s.pattern_detected || null
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Signal generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
