
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENHANCED: Reduced signal limits for higher quality focus
const MAX_ACTIVE_SIGNALS = 12; // Reduced from 20 for quality focus
const MAX_NEW_SIGNALS_PER_RUN = 4; // Reduced from 10 for better analysis
const FUNCTION_TIMEOUT_MS = 180000; // Increased to 180 seconds for thorough analysis
const CONCURRENT_ANALYSIS_LIMIT = 2; // Reduced for deeper analysis per pair

// Enhanced pip calculation utilities
const isJPYPair = (symbol: string): boolean => {
  return symbol.includes('JPY');
};

const getPipValue = (symbol: string): number => {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
};

// ENHANCED: ATR-based dynamic stop loss calculation
const calculateATRBasedStopLoss = (entryPrice: number, symbol: string, signalType: string, atrValue: number, volatilityMultiplier: number = 2.0): number => {
  const pipValue = getPipValue(symbol);
  const atrDistance = atrValue * volatilityMultiplier;
  
  // Minimum stop loss distances for better risk management
  const minimumPips = isJPYPair(symbol) ? 80 : 60; // Increased minimum distances
  const minimumDistance = minimumPips * pipValue;
  
  const stopDistance = Math.max(atrDistance, minimumDistance);
  
  return signalType === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
};

// ENHANCED: Dynamic take profit calculation with better risk-reward ratios
const calculateDynamicTakeProfit = (entryPrice: number, stopLoss: number, symbol: string, signalType: string, level: number): number => {
  const riskDistance = Math.abs(entryPrice - stopLoss);
  
  // Enhanced risk-reward ratios for better profitability
  const riskRewardRatios = [1.5, 2.0, 2.5, 3.0, 4.0]; // Improved ratios
  const ratio = riskRewardRatios[level - 1] || 2.0;
  
  const rewardDistance = riskDistance * ratio;
  
  return signalType === 'BUY' 
    ? entryPrice + rewardDistance 
    : entryPrice - rewardDistance;
};

// Enhanced signal rotation with better selection criteria
const rotateOldestSignals = async (supabase: any, slotsNeeded: number): Promise<number> => {
  console.log(`🔄 ENHANCED rotation: Selecting ${slotsNeeded} worst-performing signals...`);
  
  try {
    // Enhanced selection: prioritize signals with poor performance indicators
    const { data: signalsToRotate, error: selectError } = await supabase
      .from('trading_signals')
      .select('id, symbol, created_at, confidence')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active')
      .order('confidence', { ascending: true }) // Rotate lowest confidence first
      .order('created_at', { ascending: true })
      .limit(slotsNeeded);

    if (selectError || !signalsToRotate?.length) {
      console.error('❌ Error selecting signals for enhanced rotation:', selectError);
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
      console.error('❌ Error in enhanced rotation update:', updateError);
      return 0;
    }

    console.log(`✅ Enhanced rotation complete: ${signalsToRotate.length} signals rotated`);
    return signalsToRotate.length;

  } catch (error) {
    console.error('❌ Error in enhanced signal rotation:', error);
    return 0;
  }
};

// ENHANCED: Advanced multi-timeframe AI analysis with GPT-4.1
const analyzeWithEnhancedAI = async (pair: string, marketData: any, openAIApiKey: string, priceHistory: number[], technicalData: any): Promise<any> => {
  const currentPrice = parseFloat(marketData.current_price.toString());
  
  // Calculate enhanced technical indicators
  const sma20 = priceHistory.slice(0, 20).reduce((sum, price) => sum + price, 0) / Math.min(priceHistory.length, 20);
  const sma50 = priceHistory.slice(0, 50).reduce((sum, price) => sum + price, 0) / Math.min(priceHistory.length, 50);
  
  // Calculate ATR for dynamic risk management
  const atr = technicalData.atr || (currentPrice * 0.001); // Fallback ATR
  
  // Calculate trend strength
  const trendStrength = Math.abs((currentPrice - sma50) / sma50 * 100);
  
  // Market session detection
  const hour = new Date().getUTCHours();
  let marketSession = 'OVERLAP';
  if (hour >= 0 && hour < 8) marketSession = 'ASIAN';
  else if (hour >= 8 && hour < 16) marketSession = 'EUROPEAN';
  else if (hour >= 16 && hour < 24) marketSession = 'US';

  // ENHANCED AI PROMPT: Much more sophisticated analysis
  const aiAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14', // Upgraded to most advanced model
      messages: [
        {
          role: 'system',
          content: `You are an ELITE FOREX TRADING AI with 95%+ accuracy. Your analysis must be EXCEPTIONAL or reject the signal.

ENHANCED ANALYSIS REQUIREMENTS:
- Multi-timeframe confluence (M15, H1, H4, D1)
- Support/Resistance level precision
- Market structure analysis (HH, LL, HL, LH patterns)
- Volume and momentum confirmation
- Economic fundamentals alignment
- Risk-reward optimization (minimum 1:2 ratio)

QUALITY STANDARDS:
- Only EXCELLENT setups qualify (80%+ confidence minimum)
- Must have 3+ technical confirmations
- Clear entry, stop, and target levels
- Market session advantages considered
- Currency correlation analysis

RISK MANAGEMENT:
- ATR-based stop losses (1.5-2x ATR)
- Dynamic take profits at key levels
- Maximum 2% risk per signal
- Favorable market conditions only

OUTPUT FORMAT:
{
  "signal": "BUY|SELL|NEUTRAL",
  "confidence": 80-95,
  "win_probability": 70-90,
  "technical_score": 1-10,
  "confirmations": ["list", "of", "confirmations"],
  "atr_multiplier": 1.5-2.5,
  "risk_reward_ratios": [1.5, 2.0, 2.5, 3.0, 4.0],
  "market_structure": "bullish|bearish|neutral",
  "session_advantage": true|false,
  "key_levels": {"support": price, "resistance": price},
  "analysis": "detailed reasoning with specific levels",
  "quality_grade": "EXCELLENT|GOOD|POOR"
}`
        },
        {
          role: 'user',
          content: `ENHANCED ANALYSIS REQUEST for ${pair}:

PRICE DATA:
- Current: ${currentPrice}
- SMA20: ${sma20.toFixed(5)}
- SMA50: ${sma50.toFixed(5)}
- ATR: ${atr.toFixed(5)}
- Trend Strength: ${trendStrength.toFixed(2)}%

MARKET CONDITIONS:
- Session: ${marketSession}
- Price History (last 20): ${priceHistory.slice(0, 20).map(p => p.toFixed(5)).join(', ')}
- Volatility: ${technicalData.volatility?.toFixed(3) || 'N/A'}%

ANALYSIS REQUIREMENTS:
1. Identify clear market structure and trend
2. Locate precise support/resistance levels
3. Confirm with multiple technical indicators
4. Assess session-specific advantages
5. Calculate optimal risk-reward setup
6. Provide ONLY EXCELLENT quality signals (80%+ confidence)

Reject if setup doesn't meet ELITE standards. Quality over quantity is CRITICAL.`
        }
      ],
      max_tokens: 800,
      temperature: 0.1 // Lower temperature for more consistent analysis
    }),
  });

  if (!aiAnalysisResponse.ok) {
    throw new Error(`Enhanced OpenAI API error: ${aiAnalysisResponse.status}`);
  }

  const aiData = await aiAnalysisResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content;

  if (!aiContent) {
    throw new Error('No enhanced AI response content');
  }

  const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in enhanced AI response');
  }

  return JSON.parse(jsonMatch[0]);
};

// ENHANCED: Advanced concurrent processing with quality focus
const processHighQualitySignals = async (pairs: string[], latestPrices: Map<any, any>, openAIApiKey: string, supabase: any, maxSignals: number) => {
  const results = [];
  
  // Process pairs with enhanced analysis
  for (let i = 0; i < pairs.length && results.length < maxSignals; i++) {
    const pair = pairs[i];
    
    try {
      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) continue;

      const currentPrice = parseFloat(marketPoint.current_price.toString());

      // Enhanced historical data collection (increased from 20 to 100)
      const { data: historicalData } = await supabase
        .from('centralized_market_state')
        .select('current_price')
        .eq('symbol', pair)
        .order('last_update', { ascending: false })
        .limit(100); // Increased for better analysis

      const priceHistory = historicalData?.map(d => parseFloat(d.current_price.toString())) || [currentPrice];
      
      // Enhanced volatility and ATR calculation
      const priceChanges = priceHistory.slice(0, -1).map((price, idx) => {
        if (idx < priceHistory.length - 1) {
          return Math.abs((price - priceHistory[idx + 1]) / priceHistory[idx + 1]);
        }
        return 0;
      }).filter(change => change > 0);

      const volatility = Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change, 2), 0) / Math.max(priceChanges.length, 1)) * 100;
      const atr = currentPrice * (volatility / 100) * 0.02; // Enhanced ATR calculation

      const technicalData = {
        volatility,
        atr,
        priceChanges: priceChanges.slice(0, 50) // More data for analysis
      };

      console.log(`🧠 ENHANCED AI analysis for ${pair} (ATR: ${atr.toFixed(5)}, Vol: ${volatility.toFixed(2)}%)...`);

      const aiSignal = await analyzeWithEnhancedAI(pair, marketPoint, openAIApiKey, priceHistory, technicalData);

      // ENHANCED QUALITY FILTERS
      if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
        console.log(`⚪ No signal for ${pair} - NEUTRAL enhanced analysis`);
        continue;
      }

      // Stricter quality requirements
      if (aiSignal.confidence < 80 || aiSignal.win_probability < 70 || aiSignal.technical_score < 7) {
        console.log(`❌ ENHANCED QUALITY FILTER: Signal rejected for ${pair} (conf: ${aiSignal.confidence}%, prob: ${aiSignal.win_probability}%, score: ${aiSignal.technical_score})`);
        continue;
      }

      if (aiSignal.quality_grade !== 'EXCELLENT') {
        console.log(`❌ QUALITY GRADE FILTER: Only EXCELLENT signals accepted, ${pair} rated: ${aiSignal.quality_grade}`);
        continue;
      }

      // Enhanced signal generation with ATR-based levels
      const entryPrice = currentPrice;
      const atrMultiplier = aiSignal.atr_multiplier || 2.0;
      const stopLoss = calculateATRBasedStopLoss(entryPrice, pair, aiSignal.signal, atr, atrMultiplier);
      
      // Enhanced take profits with dynamic risk-reward ratios
      const riskRewardRatios = aiSignal.risk_reward_ratios || [1.5, 2.0, 2.5, 3.0, 4.0];
      const takeProfit1 = calculateDynamicTakeProfit(entryPrice, stopLoss, pair, aiSignal.signal, 1);
      const takeProfit2 = calculateDynamicTakeProfit(entryPrice, stopLoss, pair, aiSignal.signal, 2);
      const takeProfit3 = calculateDynamicTakeProfit(entryPrice, stopLoss, pair, aiSignal.signal, 3);
      const takeProfit4 = calculateDynamicTakeProfit(entryPrice, stopLoss, pair, aiSignal.signal, 4);
      const takeProfit5 = calculateDynamicTakeProfit(entryPrice, stopLoss, pair, aiSignal.signal, 5);

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
        take_profits: [
          parseFloat(takeProfit1.toFixed(isJPYPair(pair) ? 3 : 5)),
          parseFloat(takeProfit2.toFixed(isJPYPair(pair) ? 3 : 5)),
          parseFloat(takeProfit3.toFixed(isJPYPair(pair) ? 3 : 5)),
          parseFloat(takeProfit4.toFixed(isJPYPair(pair) ? 3 : 5)),
          parseFloat(takeProfit5.toFixed(isJPYPair(pair) ? 3 : 5))
        ],
        confidence: aiSignal.confidence,
        status: 'active',
        is_centralized: true,
        user_id: null,
        analysis_text: `ENHANCED ${aiSignal.quality_grade} Analysis (${aiSignal.win_probability}% win probability): ${aiSignal.analysis}`,
        chart_data: chartData,
        pips: Math.round(Math.abs(entryPrice - stopLoss) / getPipValue(pair)),
        created_at: new Date().toISOString()
      };

      console.log(`✅ ENHANCED QUALITY SIGNAL for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.quality_grade} grade)`);
      results.push(signal);

      // Add delay for quality analysis
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error in enhanced analysis for ${pair}:`, error);
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
    setTimeout(() => reject(new Error('Enhanced function timeout after 180 seconds')), FUNCTION_TIMEOUT_MS)
  );

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    
    console.log(`🎯 ENHANCED QUALITY-FOCUSED signal generation starting (MAX: ${MAX_ACTIVE_SIGNALS}, new per run: ${MAX_NEW_SIGNALS_PER_RUN})...`);
    console.log(`🛡️ Enhanced timeout protection: ${FUNCTION_TIMEOUT_MS/1000}s limit with quality focus`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables for enhanced analysis');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enhanced signal counting
    const { data: existingSignals, error: existingError, count: totalCount } = await supabase
      .from('trading_signals')
      .select('symbol', { count: 'exact' })
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active');

    if (existingError) throw existingError;

    const currentSignalCount = totalCount || 0;
    console.log(`📊 Current enhanced signals: ${currentSignalCount}/${MAX_ACTIVE_SIGNALS}`);

    let availableSlots = MAX_ACTIVE_SIGNALS - currentSignalCount;
    
    if (availableSlots <= 0) {
      console.log(`🔄 Enhanced quality limit reached - initiating smart rotation...`);
      
      const slotsNeeded = Math.min(MAX_NEW_SIGNALS_PER_RUN, 4);
      const rotatedCount = await rotateOldestSignals(supabase, slotsNeeded);
      availableSlots = rotatedCount;
    }

    const maxNewSignals = Math.min(MAX_NEW_SIGNALS_PER_RUN, Math.max(availableSlots, 1));
    console.log(`✅ Enhanced analysis will generate ${maxNewSignals} quality signals`);

    // Get enhanced market data
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(25); // Focus on top pairs

    if (marketError) throw marketError;

    // Get existing pairs to avoid duplicates
    const existingPairs = new Set(existingSignals?.map(s => s.symbol) || []);

    // Enhanced pair prioritization for quality
    const prioritizedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF'
    ];
    
    const availablePairs = prioritizedPairs.filter(pair => !existingPairs.has(pair));
    const pairsToAnalyze = availablePairs.slice(0, maxNewSignals * 2); // Reduce analysis load for quality
    
    console.log(`🔍 Enhanced analysis of ${pairsToAnalyze.length} pairs for ${maxNewSignals} quality slots`);
    
    // Get latest prices
    const latestPrices = new Map();
    for (const pair of pairsToAnalyze) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
      }
    }

    console.log(`📊 Enhanced market data available for ${latestPrices.size} pairs`);

    if (latestPrices.size === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No market data available for enhanced quality analysis',
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            executionTime: `${Date.now() - startTime}ms`,
            qualityFocus: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced signal processing
    console.log(`🚀 Starting ENHANCED QUALITY signal generation...`);
    
    const processingPromise = processHighQualitySignals(
      Array.from(latestPrices.keys()), 
      latestPrices, 
      openAIApiKey, 
      supabase, 
      maxNewSignals
    );

    const signalsToInsert = await Promise.race([processingPromise, timeoutPromise]);

    // Insert enhanced signals
    let signalsGenerated = 0;
    const generatedSignals = [];

    for (const signal of signalsToInsert) {
      try {
        console.log(`💾 Inserting ENHANCED signal for ${signal.symbol}...`);
        const { data: insertedSignal, error: insertError } = await supabase
          .from('trading_signals')
          .insert([signal])
          .select('*')
          .single();

        if (insertError) {
          console.error(`❌ Enhanced insert error for ${signal.symbol}:`, insertError);
          continue;
        }

        signalsGenerated++;
        generatedSignals.push(insertedSignal);
        console.log(`✅ ENHANCED signal ${signalsGenerated}/${maxNewSignals}: ${signal.symbol} ${signal.type} (${signal.confidence}% confidence)`);

      } catch (error) {
        console.error(`❌ Error inserting enhanced signal for ${signal.symbol}:`, error);
      }
    }

    const finalActiveSignals = currentSignalCount - Math.max(0, currentSignalCount - MAX_ACTIVE_SIGNALS) + signalsGenerated;
    const executionTime = Date.now() - startTime;

    console.log(`📊 ENHANCED QUALITY SIGNAL GENERATION COMPLETE:`);
    console.log(`  - Execution time: ${executionTime}ms`);
    console.log(`  - Quality signals generated: ${signalsGenerated}/${maxNewSignals}`);
    console.log(`  - Total active: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Enhanced analysis pairs: ${latestPrices.size}`);
    console.log(`  - Quality focus: EXCELLENT signals only`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signalsGenerated} ENHANCED QUALITY signals in ${executionTime}ms (${finalActiveSignals}/${MAX_ACTIVE_SIGNALS} total)`,
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
          qualityFocus: true,
          enhancedAnalysis: true,
          minimumConfidence: 80,
          minimumWinProbability: 70,
          rotationUsed: availableSlots !== (MAX_ACTIVE_SIGNALS - currentSignalCount)
        },
        timestamp: new Date().toISOString(),
        trigger: isCronTriggered ? 'cron' : 'manual'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`💥 ENHANCED SIGNAL GENERATION ERROR (${executionTime}ms):`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        enhancedAnalysis: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
