
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENHANCED: Increased signal limit for better market coverage and diversification
const MAX_ACTIVE_SIGNALS = 20;
const MAX_NEW_SIGNALS_PER_RUN = 8;
const FUNCTION_TIMEOUT_MS = 180000;
const CONCURRENT_ANALYSIS_LIMIT = 3;

// Enhanced pip calculation utilities
const isJPYPair = (symbol: string): boolean => {
  return symbol.includes('JPY');
};

const getPipValue = (symbol: string): number => {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
};

// IMPROVED: Enhanced ATR-based stop loss with 40 pip minimum
const calculateImprovedStopLoss = (entryPrice: number, symbol: string, signalType: string, atrValue: number, volatilityMultiplier: number = 2.2): number => {
  const pipValue = getPipValue(symbol);
  const atrDistance = atrValue * volatilityMultiplier;
  
  // NEW: Improved minimum stop loss (40 pips for non-JPY, 50 pips for JPY)
  const minimumPips = isJPYPair(symbol) ? 50 : 40;
  const minimumDistance = minimumPips * pipValue;
  
  const stopDistance = Math.max(atrDistance, minimumDistance);
  
  return signalType === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
};

// NEW: Fixed pip-based take profit levels (15, 25, 40, 60, 80 pips)
const calculateFixedPipTakeProfits = (entryPrice: number, signalType: string, symbol: string): number[] => {
  const pipValue = getPipValue(symbol);
  const takeProfitPips = [15, 25, 40, 60, 80]; // Fixed pip levels
  
  return takeProfitPips.map(pips => {
    const priceDistance = pips * pipValue;
    return signalType === 'BUY' 
      ? entryPrice + priceDistance 
      : entryPrice - priceDistance;
  });
};

// Enhanced signal rotation with balanced selection criteria
const rotateOldestSignals = async (supabase: any, slotsNeeded: number): Promise<number> => {
  console.log(`🔄 BALANCED rotation: Selecting ${slotsNeeded} signals for rotation...`);
  
  try {
    // Balanced selection: prioritize oldest signals with lower confidence
    const { data: signalsToRotate, error: selectError } = await supabase
      .from('trading_signals')
      .select('id, symbol, created_at, confidence')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active')
      .order('confidence', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(slotsNeeded);

    if (selectError || !signalsToRotate?.length) {
      console.error('❌ Error selecting signals for rotation:', selectError);
      return 0;
    }

    const signalIds = signalsToRotate.map(s => s.id);
    const { error: updateError } = await supabase
      .from('trading_signals')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('id', signalIds);

    if (updateError) {
      console.error('❌ Error in rotation update:', updateError);
      return 0;
    }

    console.log(`✅ Balanced rotation complete: ${signalsToRotate.length} signals rotated`);
    return signalsToRotate.length;

  } catch (error) {
    console.error('❌ Error in signal rotation:', error);
    return 0;
  }
};

// ENHANCED: Practical multi-timeframe AI analysis with RELAXED criteria
const analyzeWithPracticalAI = async (pair: string, marketData: any, openAIApiKey: string, priceHistory: number[], technicalData: any): Promise<any> => {
  const currentPrice = parseFloat(marketData.current_price.toString());
  
  // Enhanced technical indicators with better calculations
  const sma20 = priceHistory.slice(0, Math.min(20, priceHistory.length)).reduce((sum, price) => sum + price, 0) / Math.min(priceHistory.length, 20);
  const sma50 = priceHistory.slice(0, Math.min(50, priceHistory.length)).reduce((sum, price) => sum + price, 0) / Math.min(priceHistory.length, 50);
  
  // Improved ATR calculation
  const atr = technicalData.atr || (currentPrice * 0.0015);
  
  // Enhanced trend strength calculation
  const trendStrength = Math.abs((currentPrice - sma50) / sma50 * 100);
  
  // Enhanced volatility calculation
  const volatility = technicalData.volatility || 0.5;
  
  // Market session detection with session advantages
  const hour = new Date().getUTCHours();
  let marketSession = 'OVERLAP';
  let sessionAdvantage = false;
  
  if (hour >= 0 && hour < 8) {
    marketSession = 'ASIAN';
    sessionAdvantage = ['USDJPY', 'AUDJPY', 'NZDJPY', 'GBPJPY'].includes(pair);
  } else if (hour >= 8 && hour < 16) {
    marketSession = 'EUROPEAN';
    sessionAdvantage = ['EURUSD', 'GBPUSD', 'EURGBP', 'EURCHF', 'GBPCHF'].includes(pair);
  } else if (hour >= 16 && hour < 24) {
    marketSession = 'US';
    sessionAdvantage = ['EURUSD', 'GBPUSD', 'USDCAD', 'USDCHF'].includes(pair);
  }

  // IMPROVED AI PROMPT: Focus on achievable targets with new pip structure
  const aiAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: `You are a PRACTICAL FOREX TRADING AI optimized for REALISTIC pip targets and proper risk management.

IMPROVED RISK MANAGEMENT (Fixed Pip Targets):
- Take Profit 1: FIXED 15 pips (quick wins)
- Take Profit 2: FIXED 25 pips (realistic extension)
- Take Profit 3: FIXED 40 pips (good momentum target)
- Take Profit 4: FIXED 60 pips (strong trend target)
- Take Profit 5: FIXED 80 pips (exceptional moves only)
- Stop Loss: MINIMUM 40 pips (better protection)

PRACTICAL QUALITY STANDARDS:
- Accept EXCELLENT, GOOD, and FAIR setups (65%+ confidence minimum)
- Focus on TP1 and TP2 achievement (15-25 pips)
- Proper risk-reward with 40+ pip stop loss
- Market session awareness when possible
- Clear technical reasoning for entry

OUTPUT FORMAT:
{
  "signal": "BUY|SELL|NEUTRAL",
  "confidence": 65-85,
  "win_probability": 55-75,
  "technical_score": 5-10,
  "confirmations": ["list", "of", "confirmations"],
  "atr_multiplier": 2.0-2.5,
  "market_structure": "bullish|bearish|neutral",
  "session_advantage": true|false,
  "key_levels": {"support": price, "resistance": price},
  "analysis": "practical reasoning with focus on 15-25 pip targets",
  "quality_grade": "EXCELLENT|GOOD|FAIR"
}`
        },
        {
          role: 'user',
          content: `IMPROVED ANALYSIS REQUEST for ${pair} with FIXED PIP TARGETS:

PRICE DATA:
- Current: ${currentPrice}
- SMA20: ${sma20.toFixed(5)}
- SMA50: ${sma50.toFixed(5)}
- ATR: ${atr.toFixed(5)}
- Trend Strength: ${trendStrength.toFixed(2)}%
- Volatility: ${volatility.toFixed(3)}%

MARKET CONDITIONS:
- Session: ${marketSession}
- Session Advantage: ${sessionAdvantage}
- Price History (last 15): ${priceHistory.slice(0, 15).map(p => p.toFixed(5)).join(', ')}

IMPROVED TARGET STRUCTURE:
- TP1: 15 pips (PRIMARY TARGET - focus here)
- TP2: 25 pips (secondary target)
- TP3-5: 40, 60, 80 pips (bonus targets)
- SL: Minimum 40 pips (better protection)

Analyze for signals that can realistically hit 15-25 pips with proper 40+ pip stop loss protection. Focus on PRACTICAL setups that work in current market conditions.
`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    }),
  });

  if (!aiAnalysisResponse.ok) {
    throw new Error(`Enhanced OpenAI API error: ${aiAnalysisResponse.status}`);
  }

  const aiData = await aiAnalysisResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content;

  if (!aiContent) {
    throw new Error('No AI response content');
  }

  const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  return JSON.parse(jsonMatch[0]);
};

// ENHANCED: Improved signal processing with fixed pip targets
const processBalancedQualitySignals = async (pairs: string[], latestPrices: Map<any, any>, openAIApiKey: string, supabase: any, maxSignals: number) => {
  const results = [];
  
  for (let i = 0; i < pairs.length && results.length < maxSignals; i++) {
    const pair = pairs[i];
    
    try {
      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) continue;

      const currentPrice = parseFloat(marketPoint.current_price.toString());

      // Enhanced historical data collection
      const { data: historicalData } = await supabase
        .from('centralized_market_state')
        .select('current_price')
        .eq('symbol', pair)
        .order('last_update', { ascending: false })
        .limit(100);

      const priceHistory = historicalData?.map(d => parseFloat(d.current_price.toString())) || [currentPrice];
      
      // Enhanced volatility and ATR calculation
      const priceChanges = priceHistory.slice(0, -1).map((price, idx) => {
        if (idx < priceHistory.length - 1) {
          return Math.abs((price - priceHistory[idx + 1]) / priceHistory[idx + 1]);
        }
        return 0;
      }).filter(change => change > 0);

      const volatility = Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change, 2), 0) / Math.max(priceChanges.length, 1)) * 100;
      const atr = currentPrice * (volatility / 100) * 0.025;

      const technicalData = {
        volatility,
        atr,
        priceChanges: priceChanges.slice(0, 50)
      };

      console.log(`🧠 IMPROVED AI analysis for ${pair} (ATR: ${atr.toFixed(5)}, Vol: ${volatility.toFixed(2)}%)...`);

      const aiSignal = await analyzeWithPracticalAI(pair, marketPoint, openAIApiKey, priceHistory, technicalData);

      // Quality filters
      if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
        console.log(`⚪ No signal for ${pair} - NEUTRAL analysis`);
        continue;
      }

      if (aiSignal.confidence < 65 || aiSignal.win_probability < 55 || aiSignal.technical_score < 5) {
        console.log(`❌ QUALITY FILTER: Signal rejected for ${pair} (conf: ${aiSignal.confidence}%, prob: ${aiSignal.win_probability}%, score: ${aiSignal.technical_score})`);
        continue;
      }

      if (!['EXCELLENT', 'GOOD', 'FAIR'].includes(aiSignal.quality_grade)) {
        console.log(`❌ QUALITY GRADE FILTER: ${pair} rated: ${aiSignal.quality_grade}`);
        continue;
      }

      // IMPROVED: Enhanced signal generation with fixed pip targets
      const entryPrice = currentPrice;
      const atrMultiplier = aiSignal.atr_multiplier || 2.2;
      
      // NEW: Improved stop loss with 40 pip minimum
      const stopLoss = calculateImprovedStopLoss(entryPrice, pair, aiSignal.signal, atr, atrMultiplier);
      
      // NEW: Fixed pip-based take profits (15, 25, 40, 60, 80 pips)
      const takeProfits = calculateFixedPipTakeProfits(entryPrice, aiSignal.signal, pair);

      // Enhanced chart data generation
      const chartData = [];
      const baseTime = Date.now() - (45 * 60 * 1000);
      
      for (let j = 0; j < 30; j++) {
        const timePoint = baseTime + (j * 90 * 1000);
        const historicalPrice = priceHistory[Math.floor(j / 3)] || currentPrice;
        const priceVariation = (Math.sin(j * 0.2) + Math.random() * 0.1 - 0.05) * (historicalPrice * 0.0001);
        const chartPrice = historicalPrice + priceVariation;
        
        chartData.push({
          time: timePoint,
          price: parseFloat(chartPrice.toFixed(isJPYPair(pair) ? 3 : 5))
        });
      }

      chartData.push({
        time: Date.now(),
        price: parseFloat(entryPrice.toFixed(isJPYPair(pair) ? 3 : 5))
      });

      const signal = {
        symbol: pair,
        type: aiSignal.signal,
        price: parseFloat(entryPrice.toFixed(isJPYPair(pair) ? 3 : 5)),
        stop_loss: parseFloat(stopLoss.toFixed(isJPYPair(pair) ? 3 : 5)),
        take_profits: takeProfits.map(tp => parseFloat(tp.toFixed(isJPYPair(pair) ? 3 : 5))),
        confidence: aiSignal.confidence,
        status: 'active',
        is_centralized: true,
        user_id: null,
        analysis_text: `IMPROVED ${aiSignal.quality_grade} Analysis (${aiSignal.win_probability}% win probability): ${aiSignal.analysis}. TP1: 15 pips, TP2: 25 pips, SL: 40+ pips minimum.`,
        chart_data: chartData,
        pips: Math.round(Math.abs(entryPrice - stopLoss) / getPipValue(pair)),
        created_at: new Date().toISOString()
      };

      console.log(`✅ IMPROVED SIGNAL for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, TP1: 15 pips, SL: ${Math.round(Math.abs(entryPrice - stopLoss) / getPipValue(pair))} pips)`);
      results.push(signal);

      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (error) {
      console.error(`❌ Error in improved analysis for ${pair}:`, error);
    }
  }

  return results;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Function timeout after 180 seconds')), FUNCTION_TIMEOUT_MS)
  );

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    
    console.log(`🎯 IMPROVED signal generation starting (15 pip TP1, 40 pip min SL, MAX: ${MAX_ACTIVE_SIGNALS})...`);
    console.log(`🛡️ Timeout protection: ${FUNCTION_TIMEOUT_MS/1000}s limit with IMPROVED pip targets`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Signal counting
    const { data: existingSignals, error: existingError, count: totalCount } = await supabase
      .from('trading_signals')
      .select('symbol', { count: 'exact' })
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active');

    if (existingError) throw existingError;

    const currentSignalCount = totalCount || 0;
    console.log(`📊 Current signals: ${currentSignalCount}/${MAX_ACTIVE_SIGNALS}`);

    let availableSlots = MAX_ACTIVE_SIGNALS - currentSignalCount;
    
    if (availableSlots <= 0) {
      console.log(`🔄 Signal limit reached - initiating balanced rotation...`);
      
      const slotsNeeded = Math.min(MAX_NEW_SIGNALS_PER_RUN, 8);
      const rotatedCount = await rotateOldestSignals(supabase, slotsNeeded);
      availableSlots = rotatedCount;
    }

    const maxNewSignals = Math.min(MAX_NEW_SIGNALS_PER_RUN, Math.max(availableSlots, 1));
    console.log(`✅ IMPROVED analysis will generate ${maxNewSignals} signals with fixed pip targets`);

    // Get market data
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(25);

    if (marketError) throw marketError;

    // Get existing pairs to avoid duplicates
    const existingPairs = new Set(existingSignals?.map(s => s.symbol) || []);

    // Prioritized pairs for analysis
    const prioritizedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY'
    ];
    
    const availablePairs = prioritizedPairs.filter(pair => !existingPairs.has(pair));
    const pairsToAnalyze = availablePairs.slice(0, maxNewSignals * 3);
    
    console.log(`🔍 IMPROVED analysis of ${pairsToAnalyze.length} pairs for ${maxNewSignals} slots (15 pip TP1 focus)`);
    
    // Get latest prices
    const latestPrices = new Map();
    for (const pair of pairsToAnalyze) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
      }
    }

    console.log(`📊 Market data available for ${latestPrices.size} pairs`);

    if (latestPrices.size === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No market data available for improved analysis',
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            executionTime: `${Date.now() - startTime}ms`,
            improvedTargets: true,
            tp1Target: 15,
            minimumStopLoss: 40
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced signal processing
    console.log(`🚀 Starting IMPROVED signal generation with fixed pip targets...`);
    
    const processingPromise = processBalancedQualitySignals(
      Array.from(latestPrices.keys()), 
      latestPrices, 
      openAIApiKey, 
      supabase, 
      maxNewSignals
    );

    const signalsToInsert = await Promise.race([processingPromise, timeoutPromise]);

    // Insert signals
    let signalsGenerated = 0;
    const generatedSignals = [];

    for (const signal of signalsToInsert) {
      try {
        console.log(`💾 Inserting IMPROVED signal for ${signal.symbol}...`);
        const { data: insertedSignal, error: insertError } = await supabase
          .from('trading_signals')
          .insert([signal])
          .select('*')
          .single();

        if (insertError) {
          console.error(`❌ Insert error for ${signal.symbol}:`, insertError);
          continue;
        }

        signalsGenerated++;
        generatedSignals.push(insertedSignal);
        console.log(`✅ IMPROVED signal ${signalsGenerated}/${maxNewSignals}: ${signal.symbol} ${signal.type} (${signal.confidence}% confidence, TP1: 15 pips)`);

      } catch (error) {
        console.error(`❌ Error inserting signal for ${signal.symbol}:`, error);
      }
    }

    const finalActiveSignals = currentSignalCount - Math.max(0, currentSignalCount - MAX_ACTIVE_SIGNALS) + signalsGenerated;
    const executionTime = Date.now() - startTime;

    console.log(`📊 IMPROVED SIGNAL GENERATION COMPLETE:`);
    console.log(`  - Execution time: ${executionTime}ms`);
    console.log(`  - Improved signals generated: ${signalsGenerated}/${maxNewSignals}`);
    console.log(`  - Total active: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - TP1 target: 15 pips, minimum SL: 40 pips`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signalsGenerated} IMPROVED signals with fixed pip targets in ${executionTime}ms (${finalActiveSignals}/${MAX_ACTIVE_SIGNALS} total)`,
        signals: generatedSignals?.map(s => ({ 
          id: s.id, 
          symbol: s.symbol, 
          type: s.type, 
          price: s.price,
          confidence: s.confidence 
        })) || [],
        stats: {
          opportunitiesAnalyzed: latestPrices.size,
          signalsGenerated,
          totalActiveSignals: finalActiveSignals,
          signalLimit: MAX_ACTIVE_SIGNALS,
          maxNewSignalsPerRun: MAX_NEW_SIGNALS_PER_RUN,
          executionTime: `${executionTime}ms`,
          timeoutProtection: `${FUNCTION_TIMEOUT_MS/1000}s`,
          improvedTargets: true,
          tp1Target: 15,
          tp2Target: 25,
          minimumStopLoss: 40,
          takeProfitLevels: [15, 25, 40, 60, 80],
          rotationUsed: availableSlots !== (MAX_ACTIVE_SIGNALS - currentSignalCount)
        },
        timestamp: new Date().toISOString(),
        trigger: isCronTriggered ? 'cron' : 'manual'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`💥 IMPROVED SIGNAL GENERATION ERROR (${executionTime}ms):`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        improvedAnalysis: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
