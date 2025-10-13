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
  timeframe: string,
  minCandles: number
): Promise<{
  trend: 'bullish' | 'bearish' | 'neutral';
  structure: MarketStructure;
  confidence: number;
}> {
  const { data: ohlcvData } = await supabase
    .from('multi_timeframe_data')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('timestamp', { ascending: true });
  
  if (!ohlcvData || ohlcvData.length < minCandles) {
    return { trend: 'neutral', structure: null as any, confidence: 0 };
  }
  
  const atr = calculateATR(ohlcvData, 14);
  const structurePoints = identifyStructurePoints(ohlcvData, atr, symbol);
  const structure = determineMarketStructure(structurePoints, ohlcvData[ohlcvData.length - 1].close_price);
  const confidence = Math.min(95, 60 + (structurePoints.length * 2));
  
  return { trend: structure.trend, structure, confidence };
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
  const weeklyAnalysis = await analyzeTimeframeTrend(supabase, symbol, 'W', 50);
  const dailyAnalysis = await analyzeTimeframeTrend(supabase, symbol, '1D', 50);
  const fourHourAnalysis = await analyzeTimeframeTrend(supabase, symbol, '4H', 50);
  
  const aligned: string[] = [];
  let confluenceScore = 0;
  
  if (weeklyAnalysis.trend === dailyAnalysis.trend && weeklyAnalysis.trend !== 'neutral') {
    aligned.push('W+D');
    confluenceScore += 40;
  }
  
  if (dailyAnalysis.trend === fourHourAnalysis.trend && dailyAnalysis.trend !== 'neutral') {
    aligned.push('D+4H');
    confluenceScore += 30;
  }
  
  if (weeklyAnalysis.trend === dailyAnalysis.trend && 
      dailyAnalysis.trend === fourHourAnalysis.trend && 
      weeklyAnalysis.trend !== 'neutral') {
    aligned.push('W+D+4H');
    confluenceScore += 30;
  }
  
  let tradingBias: 'BUY' | 'SELL' | 'NO_TRADE' = 'NO_TRADE';
  
  if (aligned.length > 0) {
    const dominantTrend = weeklyAnalysis.trend !== 'neutral' ? weeklyAnalysis.trend : dailyAnalysis.trend;
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

// ============= MAIN HANDLER =============

serve(async (req) => {
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
    
    console.log(`⚙️ Settings: Threshold=${thresholdLevel}, AI=${aiValidationEnabled}`);
    
    const symbols = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
      'EURGBP', 'GBPCAD', 'EURAUD', 'EURCAD', 'GBPAUD', 'CHFJPY', 'NZDJPY',
      'GBPNZD', 'AUDCHF', 'CADJPY', 'NZDCHF', 'NZDCAD', 'AUDNZD', 'AUDJPY',
      'EURNZD', 'EURJPY', 'CADCHF', 'EURCHF', 'GBPCHF', 'GBPJPY'
    ];
    
    const candidateSignals = [];
    
    // === TIER 1: STRUCTURE-BASED ANALYSIS ===
    for (const symbol of symbols) {
      try {
        console.log(`🎯 Analyzing ${symbol}...`);
        
        // 1. Multi-timeframe structure analysis
        const weeklyAnalysis = await analyzeTimeframeTrend(supabase, symbol, 'W', 50);
        const dailyAnalysis = await analyzeTimeframeTrend(supabase, symbol, '1D', 50);
        const fourHourAnalysis = await analyzeTimeframeTrend(supabase, symbol, '4H', 50);
        
        // 2. Check multi-timeframe confluence
        const multiTF = await analyzeMultiTimeframeAlignment(supabase, symbol);
        if (multiTF.tradingBias === 'NO_TRADE') {
          console.log(`❌ ${symbol}: No multi-TF confluence`);
          continue;
        }
        
        console.log(`✅ ${symbol}: ${multiTF.tradingBias} bias (score: ${multiTF.confluenceScore})`);
        
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
        
        // 4. Get current market data
        const { data: currentMarket } = await supabase
          .from('centralized_market_state')
          .select('*')
          .eq('symbol', symbol)
          .single();
        
        if (!currentMarket) continue;
        const currentPrice = currentMarket.current_price;
        
        // 5. Check if price is at AOI
        const atAOI = checkIfPriceAtAOI(currentPrice, multiTF.tradingBias, weeklyZones, dailyZones, symbol);
        
        if (!atAOI && thresholdLevel === 'HIGH') {
          console.log(`❌ ${symbol}: Not at AOI (HIGH threshold requires retest)`);
          continue;
        }
        
        // 6. Find relevant structure point for SL
        const relevantStructure = multiTF.tradingBias === 'BUY' 
          ? fourHourAnalysis.structure.structurePoints.filter(p => p.type === 'HL').slice(-1)[0]
          : fourHourAnalysis.structure.structurePoints.filter(p => p.type === 'LH').slice(-1)[0];
        
        if (!relevantStructure) {
          console.log(`❌ ${symbol}: No relevant structure point for SL`);
          continue;
        }
        
        // 7. Calculate SL/TP
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
        
        // 8. Calculate confidence
        let confidence = multiTF.confluenceScore;
        if (overlappingZones.bonusScore > 0) confidence += 10;
        if (atAOI) confidence += 5;
        
        const signal = {
          symbol,
          type: multiTF.tradingBias,
          price: currentPrice,
          stop_loss: stopLoss,
          take_profits: takeProfits,
          confidence: Math.min(95, confidence),
          strategy_type: 'trend_continuation',
          entry_timeframe: multiTF.alignedTimeframes.includes('W+D') ? '4H' : '1H',
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
            timestamp: p.timestamp.toISOString()
          }))
        };
        
        candidateSignals.push(signal);
        console.log(`✅ ${symbol}: Trend Continuation signal generated (${signal.type})`);
        
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }
    
    console.log(`✅ Tier 1: ${candidateSignals.length} candidate signals`);
    
    // === TIER 2: AI VALIDATION (if enabled) ===
    let finalSignals = candidateSignals;
    
    if (aiValidationEnabled) {
      console.log(`🤖 AI validation for ${candidateSignals.length} signals...`);
      finalSignals = [];
      
      for (const signal of candidateSignals) {
        try {
          const { data: validation } = await supabase.functions.invoke('validate-signal-with-ai', {
            body: { signal }
          });
          
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
            
            console.log(`✅ AI approved: ${signal.symbol} (${blendedConfidence}%)`);
          } else {
            console.log(`❌ AI rejected: ${signal.symbol}`);
          }
        } catch (error) {
          console.error(`❌ AI validation error for ${signal.symbol}:`, error);
          // On error, include signal anyway
          finalSignals.push(signal);
        }
      }
      
      console.log(`✅ AI validation: ${finalSignals.length}/${candidateSignals.length} approved`);
    }
    
    // Insert approved signals
    if (finalSignals.length > 0) {
      const signalsToInsert = finalSignals.map(s => ({
        symbol: s.symbol,
        type: s.type,
        price: s.price,
        stop_loss: s.stop_loss,
        take_profits: s.take_profits,
        confidence: s.confidence,
        analysis_text: s.analysis_text || `${s.strategy_type} signal - ${s.timeframe_confluence.aligned.join(', ')} confluence`,
        timestamp: new Date().toISOString(),
        status: 'active',
        is_centralized: true,
        user_id: null,
        strategy_type: s.strategy_type,
        entry_timeframe: s.entry_timeframe,
        timeframe_confluence: s.timeframe_confluence,
        aoi_zones: s.aoi_zones,
        structure_points: s.structure_points,
        ai_validated: s.ai_validated || false,
        ai_confidence: s.ai_confidence || null,
        structure_confidence: s.structure_confidence || s.confidence
      }));
      
      const { error: insertError } = await supabase
        .from('trading_signals')
        .insert(signalsToInsert);
      
      if (insertError) {
        console.error('❌ Error inserting signals:', insertError);
      } else {
        console.log(`✅ Inserted ${finalSignals.length} signals`);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      tier1_candidates: candidateSignals.length,
      tier2_approved: finalSignals.length,
      ai_validation_enabled: aiValidationEnabled,
      threshold_level: thresholdLevel,
      signals: finalSignals.map(s => ({
        symbol: s.symbol,
        type: s.type,
        confidence: s.confidence,
        strategy_type: s.strategy_type
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
