
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OPTIMIZED: Reduced maximum signals to prevent timeout
const MAX_ACTIVE_SIGNALS = 15; // Reduced from 20
const MAX_NEW_SIGNALS_PER_RUN = 8; // New: Maximum signals to generate per execution
const FUNCTION_TIMEOUT_MS = 120000; // 120 seconds internal timeout
const CONCURRENT_ANALYSIS_LIMIT = 3; // Process 3 pairs concurrently

// Pip calculation utilities for the edge function
const isJPYPair = (symbol: string): boolean => {
  return symbol.includes('JPY');
};

const getPipValue = (symbol: string): number => {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
};

// Improved stop loss calculation with minimum 45-50 pip distance and technical levels
const calculateRealisticStopLoss = (entryPrice: number, symbol: string, signalType: string, pipDistance: number): number => {
  // Ensure minimum distance of 45 pips for non-JPY pairs, 50 for JPY pairs
  let minimumPips = isJPYPair(symbol) ? 50 : 45;
  pipDistance = Math.max(pipDistance, minimumPips);
  
  const pipValue = getPipValue(symbol);
  const stopLossDistance = pipDistance * pipValue;
  
  return signalType === 'BUY' 
    ? entryPrice - stopLossDistance 
    : entryPrice + stopLossDistance;
};

// Improved take profit calculation with focus on risk-reward ratio
const calculateRealisticTakeProfit = (entryPrice: number, symbol: string, signalType: string, pipDistance: number): number => {
  const pipValue = getPipValue(symbol);
  const takeProfitDistance = pipDistance * pipValue;
  
  return signalType === 'BUY' 
    ? entryPrice + takeProfitDistance 
    : entryPrice - takeProfitDistance;
};

// OPTIMIZED: Streamlined AI analysis with reduced prompt size
const analyzeWithAI = async (pair: string, marketData: any, openAIApiKey: string, priceHistory: number[], volatilityInfo: any): Promise<any> => {
  const currentPrice = parseFloat(marketData.current_price.toString());
  const priceChange = priceHistory.length > 1 ? 
    ((currentPrice - priceHistory[priceHistory.length - 1]) / priceHistory[priceHistory.length - 1] * 100) : 0;

  // OPTIMIZED: Reduced prompt size while maintaining analysis quality
  const aiAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Faster model
      messages: [
        {
          role: 'system',
          content: `You are a FOREX AI generating trading signals with 70%+ win probability. Analyze BOTH bullish and bearish scenarios equally.

CRITICAL: Every signal MUST have proper AI analysis - no signals without thorough evaluation.

RISK MANAGEMENT:
- Minimum stop loss: 45-50 pips (scaled by volatility)
- Target risk:reward ratio of 1:1.5 minimum
- First TP minimum 70-80 pips

ANALYSIS REQUIREMENTS:
- Equal weight to BUY and SELL opportunities
- Technical level analysis (support/resistance)
- Session-specific considerations
- Momentum and volatility factors

Respond with JSON:
{
  "signal": "BUY" or "SELL" or "NEUTRAL",
  "confidence": 60-95,
  "win_probability": 65-90,
  "confirmations_count": 2+,
  "stop_loss_pips": 45-90,
  "take_profit_pips": [70, 100, 130, 160, 190],
  "risk_reward_ratio": "1:X",
  "analysis": "detailed reasoning for direction choice",
  "setup_quality": "GOOD" or "VERY_GOOD" or "EXCELLENT"
}`
        },
        {
          role: 'user',
          content: `Analyze ${pair}:
Current: ${currentPrice}
Change: ${priceChange.toFixed(2)}%
Volatility: ${volatilityInfo.volatility.toFixed(3)}%
History: ${priceHistory.slice(0, 5).join(', ')}

Provide signal with mandatory AI analysis for 70%+ win probability.`
        }
      ],
      max_tokens: 600, // Reduced from 1200
      temperature: 0.2
    }),
  });

  if (!aiAnalysisResponse.ok) {
    throw new Error(`OpenAI API error: ${aiAnalysisResponse.status}`);
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

// OPTIMIZED: Concurrent processing function
const processPairsConcurrently = async (pairs: string[], latestPrices: Map<any, any>, openAIApiKey: string, supabase: any, maxSignals: number) => {
  const results = [];
  const batches = [];
  
  // Create batches for concurrent processing
  for (let i = 0; i < pairs.length && results.length < maxSignals; i += CONCURRENT_ANALYSIS_LIMIT) {
    batches.push(pairs.slice(i, i + CONCURRENT_ANALYSIS_LIMIT));
  }

  for (const batch of batches) {
    if (results.length >= maxSignals) break;

    const batchPromises = batch.map(async (pair) => {
      try {
        const marketPoint = latestPrices.get(pair);
        if (!marketPoint) return null;

        const currentPrice = parseFloat(marketPoint.current_price.toString());

        // Get historical data
        const { data: historicalData } = await supabase
          .from('centralized_market_state')
          .select('current_price')
          .eq('symbol', pair)
          .order('last_update', { ascending: false })
          .limit(20); // Reduced from 100

        const priceHistory = historicalData?.map(d => parseFloat(d.current_price.toString())).slice(0, 15) || [currentPrice];
        
        // Calculate volatility
        const priceChanges = priceHistory.slice(0, -1).map((price, i) => {
          if (i < priceHistory.length - 1) {
            return (price - priceHistory[i + 1]) / priceHistory[i + 1] * 100;
          }
          return 0;
        }).filter(change => change !== 0);

        const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / Math.max(priceChanges.length, 1);
        const priceVolatility = Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change - avgPriceChange, 2), 0) / Math.max(priceChanges.length, 1));

        const baseStopPips = isJPYPair(pair) ? 55 : 50;
        const volatilityFactor = Math.min(Math.max(priceVolatility * 10, 1), 1.5);
        const dynamicStopPips = Math.round(baseStopPips * volatilityFactor);

        console.log(`🧠 AI analysis for ${pair} at ${currentPrice}...`);

        const aiSignal = await analyzeWithAI(pair, marketPoint, openAIApiKey, priceHistory, {
          volatility: priceVolatility,
          dynamicStopPips
        });

        // Validation checks
        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚪ No signal for ${pair} - NEUTRAL analysis`);
          return null;
        }

        if (aiSignal.confidence < 60 || aiSignal.win_probability < 65 || aiSignal.confirmations_count < 2) {
          console.log(`⚠️ Signal quality too low for ${pair}`);
          return null;
        }

        const riskRewardRatio = parseFloat(aiSignal.risk_reward_ratio.split(':')[1]) || 0;
        if (riskRewardRatio < 1.5) {
          console.log(`⚠️ Risk-reward too low for ${pair}: ${aiSignal.risk_reward_ratio}`);
          return null;
        }

        // Generate signal data
        const entryPrice = currentPrice;
        const stopLossPips = Math.max(aiSignal.stop_loss_pips || dynamicStopPips, isJPYPair(pair) ? 50 : 45);
        const takeProfitPips = aiSignal.take_profit_pips || [70, 100, 130, 160, 190];

        const stopLoss = calculateRealisticStopLoss(entryPrice, pair, aiSignal.signal, stopLossPips);
        const takeProfit1 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[0]);
        const takeProfit2 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[1]);
        const takeProfit3 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[2]);
        const takeProfit4 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[3]);
        const takeProfit5 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[4]);

        // Generate chart data
        const chartData = [];
        const baseTime = Date.now() - (30 * 60 * 1000);
        
        for (let i = 0; i < 20; i++) { // Reduced from 30
          const timePoint = baseTime + (i * 90 * 1000); // 90 second intervals
          const historicalPrice = priceHistory[Math.floor(i / 4)] || currentPrice;
          const priceVariation = (Math.sin(i * 0.3) + Math.random() * 0.15 - 0.075) * (historicalPrice * 0.0002);
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
          analysis_text: `${aiSignal.setup_quality} AI Analysis (${aiSignal.win_probability}% win probability): ${aiSignal.analysis}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: new Date().toISOString()
        };

        console.log(`✅ Generated AI signal for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence)`);
        return signal;

      } catch (error) {
        console.error(`❌ Error analyzing ${pair}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(Boolean);
    results.push(...validResults);

    if (results.length >= maxSignals) {
      results.splice(maxSignals); // Trim to exact limit
      break;
    }

    // Small delay between batches to prevent overwhelming the system
    if (results.length < maxSignals && batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  // OPTIMIZED: Function timeout protection
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Function timeout after 120 seconds')), FUNCTION_TIMEOUT_MS)
  );

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    
    console.log(`🎯 OPTIMIZED signal generation starting (MAX: ${MAX_NEW_SIGNALS_PER_RUN} new signals)...`);
    console.log(`🛡️ Enhanced timeout protection: ${FUNCTION_TIMEOUT_MS/1000}s limit`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check existing active signals
    console.log(`🔍 Checking existing signals (limit: ${MAX_ACTIVE_SIGNALS})...`);
    const { data: existingSignals, error: existingError } = await supabase
      .from('trading_signals')
      .select('symbol')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active');

    if (existingError) throw existingError;

    const existingPairs = new Set(existingSignals?.map(s => s.symbol) || []);
    const currentSignalCount = existingPairs.size;
    
    console.log(`📊 Current signals: ${currentSignalCount}/${MAX_ACTIVE_SIGNALS}`);

    if (currentSignalCount >= MAX_ACTIVE_SIGNALS) {
      console.log(`🚫 Signal limit reached - no new generation`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Signal limit reached (${currentSignalCount}/${MAX_ACTIVE_SIGNALS})`,
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            limitReached: true,
            executionTime: `${Date.now() - startTime}ms`
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxNewSignals = Math.min(MAX_NEW_SIGNALS_PER_RUN, MAX_ACTIVE_SIGNALS - currentSignalCount);
    console.log(`✅ Can generate up to ${maxNewSignals} new AI-analyzed signals`);

    // Market data validation
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(30); // Reduced from 50

    if (marketError) throw marketError;

    // OPTIMIZED: Prioritized currency pairs (focus on majors first)
    const prioritizedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', // Majors first
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
      'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD'
    ];
    
    const availablePairs = prioritizedPairs.filter(pair => !existingPairs.has(pair));
    const pairsToAnalyze = availablePairs.slice(0, maxNewSignals * 2); // Analyze 2x pairs to account for rejections
    
    console.log(`🔍 Will analyze ${pairsToAnalyze.length} prioritized pairs for ${maxNewSignals} slots`);
    
    // Get latest prices
    const latestPrices = new Map();
    for (const pair of pairsToAnalyze) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
      }
    }

    console.log(`📊 Found market data for ${latestPrices.size} pairs`);

    if (latestPrices.size === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No market data available',
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            totalActiveSignals: currentSignalCount,
            executionTime: `${Date.now() - startTime}ms`
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OPTIMIZED: Concurrent processing with timeout protection
    console.log(`🚀 Starting optimized concurrent AI analysis (${CONCURRENT_ANALYSIS_LIMIT} parallel)...`);
    
    const processingPromise = processPairsConcurrently(
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
        console.log(`💾 Inserting AI signal for ${signal.symbol}...`);
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
        console.log(`✅ Inserted signal ${signalsGenerated}/${maxNewSignals}: ${signal.symbol} ${signal.type}`);

      } catch (error) {
        console.error(`❌ Error inserting signal for ${signal.symbol}:`, error);
      }
    }

    const finalActiveSignals = currentSignalCount + signalsGenerated;
    const executionTime = Date.now() - startTime;

    console.log(`📊 OPTIMIZED GENERATION COMPLETE:`);
    console.log(`  - Execution time: ${executionTime}ms (limit: ${FUNCTION_TIMEOUT_MS}ms)`);
    console.log(`  - New AI signals: ${signalsGenerated}/${maxNewSignals}`);
    console.log(`  - Total active: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Pairs analyzed: ${latestPrices.size}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Optimized generation: ${signalsGenerated} AI-analyzed signals in ${executionTime}ms`,
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
          concurrentLimit: CONCURRENT_ANALYSIS_LIMIT,
          executionTime: `${executionTime}ms`,
          timeoutProtection: `${FUNCTION_TIMEOUT_MS/1000}s`,
          enhancedMode: true,
          aiAnalysisRequired: true
        },
        timestamp: new Date().toISOString(),
        trigger: isCronTriggered ? 'cron' : 'manual'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`💥 OPTIMIZED GENERATION ERROR (${executionTime}ms):`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
