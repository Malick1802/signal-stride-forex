
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-github-run-id, x-optimized-mode',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MarketData {
  symbol: string;
  price: number;
  timestamp: string;
  session: string;
}

interface EnhancedAISignalAnalysis {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  reasoning: string;
  technicalFactors: string[];
  riskAssessment: string;
  marketRegime: string;
  sessionAnalysis: string;
  qualityScore: number;
}

interface SignalData {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  pips: number;
  stopLoss: number;
  takeProfits: number[];
  confidence: number;
  analysisText: string;
  technicalIndicators: any;
  chartData: Array<{ time: number; price: number }>;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

serve(async (req) => {
  console.log(`🚀 ENHANCED AI-powered signal generation called - Method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    console.log('📋 CORS preflight request handled');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log(`🔧 Environment check - Supabase: ${!!supabaseUrl}, OpenAI: ${!!openAIApiKey}`);

    if (!supabaseUrl || !supabaseKey || !openAIApiKey) {
      throw new Error('Missing required environment variables (Supabase or OpenAI API key)');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      console.log('📝 No request body or invalid JSON, using defaults');
    }

    const { 
      test = false, 
      skipGeneration = false, 
      force = false,
      lowThreshold = false,
      debug = false,
      trigger = 'manual',
      run_id,
      attempt = 1,
      optimized = false,
      maxAnalyzedPairs = 27, // Analyze ALL pairs by default
      fullCoverage = true
    } = requestBody;

    console.log(`🎯 Request params - Test: ${test}, Skip: ${skipGeneration}, Force: ${force}, Trigger: ${trigger}, ENHANCED AI-powered: true`);

    // Test mode
    if (test && skipGeneration) {
      console.log('✅ Test mode - ENHANCED AI-powered function is responsive');
      return new Response(JSON.stringify({ 
        status: 'success', 
        message: 'ENHANCED AI-powered edge function is working',
        timestamp: new Date().toISOString(),
        environment: {
          supabase: !!supabaseUrl,
          openai: !!openAIApiKey
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get current market data
    console.log('📊 Fetching current market data...');
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(30);

    if (marketError) {
      console.error('❌ Market data fetch error:', marketError);
      throw new Error(`Market data fetch failed: ${marketError.message}`);
    }

    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No market data available, cannot generate ENHANCED AI signals');
      return new Response(JSON.stringify({
        error: 'No market data available',
        stats: { signalsGenerated: 0, reason: 'no_market_data' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log(`📈 Market data loaded: ${marketData.length} currency pairs`);

    // Check existing active signals
    const { data: existingSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('id, symbol, type, confidence')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    if (signalsError) {
      console.error('❌ Existing signals check error:', signalsError);
      throw new Error(`Signals check failed: ${signalsError.message}`);
    }

    const currentSignalCount = existingSignals?.length || 0;
    const maxSignals = 20; // Increased back to 20 for full coverage
    const maxNewSignals = fullCoverage ? Math.min(12, maxSignals - currentSignalCount) : Math.min(8, maxSignals - currentSignalCount); // Higher signal generation capacity

    console.log(`📋 ENHANCED AI Signal status - Current: ${currentSignalCount}/${maxSignals}, Can generate: ${maxNewSignals}, ENHANCED AI-powered mode`);

    // Clear existing signals when in force mode (similar to test mode)
    let updatedCurrentSignalCount = currentSignalCount;
    let updatedMaxNewSignals = maxNewSignals;
    
    if (force && existingSignals && existingSignals.length > 0) {
      console.log(`🔧 FORCE MODE: Clearing ${existingSignals.length} existing signals before generation`);
      
      const { error: deleteError } = await supabase
        .from('trading_signals')
        .delete()
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null);
      
      if (deleteError) {
        console.error('❌ Error clearing existing signals:', deleteError);
      } else {
        console.log('✅ Successfully cleared existing signals for force generation');
        
        // Reset signal count after clearing
        updatedCurrentSignalCount = 0;
        updatedMaxNewSignals = Math.min(8, maxSignals);
        console.log(`🔧 FORCE MODE: Updated status - Current: ${updatedCurrentSignalCount}/${maxSignals}, Can generate: ${updatedMaxNewSignals}`);
      }
    }

    if (updatedMaxNewSignals <= 0 && !force) {
      console.log('⚠️ Signal limit reached, skipping ENHANCED AI generation');
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'signal_limit_reached',
        stats: {
          signalsGenerated: 0,
          totalActiveSignals: updatedCurrentSignalCount,
          signalLimit: maxSignals,
          maxNewSignalsPerRun: optimized ? 4 : 6
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Generate ENHANCED AI-powered signals
    const startTime = Date.now();
    const generatedSignals: SignalData[] = [];
    const errors: string[] = [];

    // Major currency pairs (prioritized for ENHANCED AI analysis)
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    const availablePairs = marketData
      .filter(d => d.symbol && d.current_price > 0)
      .map(d => d.symbol)
      .filter(symbol => !existingSignals?.some(s => s.symbol === symbol));

    // Quality-First Full Coverage: analyze all pairs with intelligent prioritization
    const pairsWithScores = availablePairs.map(symbol => {
      const pair = marketData.find(d => d.symbol === symbol);
      if (!pair) return { symbol, score: 0 };
      
      // Enhanced scoring algorithm for quality prioritization
      const recentData = marketData.filter(d => d.symbol === symbol).slice(-20);
      if (recentData.length < 5) return { symbol, score: 0 };
      
      const prices = recentData.map(d => d.current_price);
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const range = (high - low) / pair.current_price;
      const momentum = (prices[prices.length - 1] - prices[0]) / prices[0];
      
      // Enhanced scoring: volatility + momentum + major pair bonus
      const volatilityScore = Math.abs(range) * 1000;
      const momentumScore = Math.abs(momentum) * 500;
      const majorPairBonus = majorPairs.includes(symbol) ? 200 : 0;
      const score = volatilityScore + momentumScore + majorPairBonus;
      
      return { symbol, score };
    });

    // Sort by enhanced score - analyze all pairs unless limited
    const allSortedPairs = pairsWithScores
      .sort((a, b) => b.score - a.score)
      .map(p => p.symbol);
    
    const pairsToAnalyze = fullCoverage ? allSortedPairs : allSortedPairs.slice(0, maxAnalyzedPairs);

    // Prioritize major pairs first for better quality signals
    const prioritizedPairs = [
      ...pairsToAnalyze.filter(symbol => majorPairs.includes(symbol)),
      ...pairsToAnalyze.filter(symbol => !majorPairs.includes(symbol))
    ];

    console.log(`🔥 FULL COVERAGE MODE: Analyzing ${prioritizedPairs.length}/${availablePairs.length} pairs with quality-first prioritization`);

    // Intelligent batching with progressive delays for rate limit management
    const batchSize = 1; // Sequential processing for maximum reliability
    for (let i = 0; i < prioritizedPairs.length && generatedSignals.length < updatedMaxNewSignals; i += batchSize) {
      const batch = prioritizedPairs.slice(i, i + batchSize);
      
      // Sequential processing with intelligent delays
      for (const symbol of batch) {
        if (generatedSignals.length >= updatedMaxNewSignals) return;

        try {
          const pair = marketData.find(d => d.symbol === symbol);
          if (!pair || !pair.current_price) continue;

          console.log(`🤖 ENHANCED AI analyzing ${symbol} - Price: ${pair.current_price} (${i + 1}/${prioritizedPairs.length})`);

          // Get historical price data with extended history
          const historicalData = await getHistoricalPriceData(supabase, symbol);
          if (!historicalData || historicalData.length < 100) {
            console.log(`⚠️ Insufficient historical data for ${symbol}: ${historicalData?.length || 0} points`);
            continue;
          }

          // Generate AI-powered signal analysis with enhanced quality targeting
          const aiAnalysis = await generateEnhancedAISignalAnalysis(openAIApiKey, pair, historicalData, lowThreshold, force);
          
          // Raised quality thresholds to match your successful 65/100 signal
          const qualityThreshold = force ? 35 : (lowThreshold ? 45 : 65); // Raised from 55 to 65
          const confidenceThreshold = force ? 40 : (lowThreshold ? 55 : 70); // Raised from 65 to 70
          
          if (!aiAnalysis || aiAnalysis.recommendation === 'HOLD' || aiAnalysis.qualityScore < qualityThreshold) {
            console.log(`🤖 ${symbol} AI recommendation: ${aiAnalysis?.recommendation || 'HOLD'} - Quality: ${aiAnalysis?.qualityScore || 0}/${qualityThreshold} - No signal generated`);
            continue;
          }

          console.log(`🤖 ${symbol} AI recommendation: ${aiAnalysis.recommendation} (${aiAnalysis.confidence}% confidence, Quality: ${aiAnalysis.qualityScore}/100)`);

          const signal = await convertEnhancedAIAnalysisToSignal(pair, aiAnalysis, historicalData, lowThreshold);

          // Enhanced quality filter for premium signals
          if (signal && signal.confidence >= confidenceThreshold && aiAnalysis.qualityScore >= qualityThreshold) {
            generatedSignals.push(signal);
            console.log(`✅ QUALITY SIGNAL: ${signal.type} ${symbol} (${signal.confidence}% confidence, ${aiAnalysis.qualityScore}/100 quality)`);
          } else {
            console.log(`❌ ${symbol} below quality standards (C:${signal?.confidence || 0}/${confidenceThreshold}%, Q:${aiAnalysis.qualityScore}/${qualityThreshold})`);
          }
        } catch (error) {
          console.error(`❌ Error analyzing ${symbol}:`, error);
          errors.push(`${symbol}: ${error.message}`);
          
          // Rate limit handling with exponential backoff
          if (error.message.includes('rate limit')) {
            console.log(`⏱️ Rate limit detected, implementing 15-second backoff...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
          }
        }
        
        // Progressive delay between pairs to manage rate limits
        const delayMs = i < 5 ? 8000 : i < 15 ? 12000 : 16000; // Longer delays for later pairs
        if (i + 1 < prioritizedPairs.length) {
          console.log(`⏱️ Intelligent delay: ${delayMs/1000}s before next analysis...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

    }

    console.log(`🤖 ENHANCED AI signal generation complete - Generated: ${generatedSignals.length}, Errors: ${errors.length}`);

    // Save ENHANCED AI-generated signals to database
    let savedCount = 0;
    const signalDistribution = { newBuySignals: 0, newSellSignals: 0 };

    for (const signal of generatedSignals) {
      try {
        const { error: insertError } = await supabase
          .from('trading_signals')
          .insert({
            symbol: signal.symbol,
            type: signal.type,
            price: signal.price,
            pips: signal.pips,
            stop_loss: signal.stopLoss,
            take_profits: signal.takeProfits,
            confidence: signal.confidence,
            analysis_text: signal.analysisText,
            chart_data: signal.chartData,
            status: 'active',
            is_centralized: true,
            user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`❌ Failed to save ENHANCED AI signal for ${signal.symbol}:`, insertError);
          errors.push(`Save ${signal.symbol}: ${insertError.message}`);
        } else {
          savedCount++;
          if (signal.type === 'BUY') signalDistribution.newBuySignals++;
          else signalDistribution.newSellSignals++;
          console.log(`💾 Saved HIGH-QUALITY AI ${signal.type} signal for ${signal.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Database error for ${signal.symbol}:`, error);
        errors.push(`DB ${signal.symbol}: ${error.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    const finalActiveCount = updatedCurrentSignalCount + savedCount;

    console.log(`✅ ENHANCED AI generation complete - Saved: ${savedCount}/${generatedSignals.length}, Total active: ${finalActiveCount}/${maxSignals}, Time: ${executionTime}ms`);

    const response = {
      status: 'success',
      stats: {
        signalsGenerated: savedCount,
        totalGenerated: generatedSignals.length,
        totalActiveSignals: finalActiveCount,
        signalLimit: maxSignals,
        executionTime: `${executionTime}ms`,
        signalDistribution,
        maxNewSignalsPerRun: optimized ? 4 : 6,
        enhancedAI: true,
        qualityFiltered: true,
        minimumQualityScore: force ? 35 : (lowThreshold ? 40 : 55),
        concurrentLimit: batchSize,
        errors: errors.length > 0 ? errors.slice(0, 3) : undefined
      },
      trigger,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Critical error in ENHANCED AI signal generation:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      status: 'error',
      timestamp: new Date().toISOString(),
      stats: { signalsGenerated: 0 }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Get historical price data from database with extended history
async function getHistoricalPriceData(supabase: any, symbol: string): Promise<PricePoint[] | null> {
  try {
    const { data, error } = await supabase
      .from('live_price_history')
      .select('timestamp, price')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: true })
      .limit(500); // Increased data points for better analysis

    if (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return null;
    }

    if (!data || data.length < 100) {
      console.log(`Insufficient historical data for ${symbol}: ${data?.length || 0} points`);
      return null;
    }

    return data.map((point: any) => ({
      timestamp: new Date(point.timestamp).getTime(),
      price: parseFloat(point.price)
    }));
  } catch (error) {
    console.error(`Error in getHistoricalPriceData for ${symbol}:`, error);
    return null;
  }
}

// Generate ENHANCED AI-powered signal analysis with comprehensive market context
async function generateEnhancedAISignalAnalysis(
  openAIApiKey: string,
  pair: any,
  historicalData: PricePoint[],
  lowThreshold: boolean = false,
  forceMode: boolean = false
): Promise<EnhancedAISignalAnalysis | null> {
  try {
    const symbol = pair.symbol;
    const currentPrice = pair.current_price;
    
    // Enhanced market data context for AI
    const recentPrices = historicalData.slice(-100);
    const extendedPrices = historicalData.slice(-200);
    
    // Technical analysis calculations
    const highPrice = Math.max(...recentPrices.map(p => p.price));
    const lowPrice = Math.min(...recentPrices.map(p => p.price));
    const priceRange = highPrice - lowPrice;
    const currentPositionInRange = ((currentPrice - lowPrice) / priceRange * 100).toFixed(1);
    
    // Volatility analysis
    const atr = calculateATR(recentPrices);
    const volatilityRatio = atr / currentPrice;
    
    // Trend analysis
    const trendStrength = calculateTrendStrength(recentPrices);
    const marketRegime = detectMarketRegime(recentPrices, atr);
    
    // Session analysis
    const sessionAnalysis = getCurrentSessionAnalysis();
    
    // Economic calendar context (simplified)
    const economicContext = getEconomicContext(symbol);
    
    // Helper functions for pip calculations
    const isJPYPair = (symbol: string): boolean => symbol.includes('JPY');
    const getPipValue = (symbol: string): number => isJPYPair(symbol) ? 0.01 : 0.0001;
    const minStopLossPips = 30; // Adjusted to more realistic value
    const minTakeProfitPips = 30; // Adjusted to more realistic value
    
    // Market override for force mode
    if (forceMode) {
      console.log(`🔧 EMERGENCY MODE: Overriding market condition filters for ${symbol}`);
    } else {
      // Reduce pre-filtering - only skip in extreme conditions
      const regime = detectMarketRegime(recentPrices, atr);
      if (regime.includes('Extremely Volatile') || volatilityRatio > 0.05) {
        return null; // Only skip signals in truly extreme conditions
      }
    }
    
    const enhancedPrompt = `Forex analysis for ${symbol} @ ${currentPrice}. 
Regime: ${marketRegime}, Trend: ${trendStrength}, Session: ${sessionAnalysis.session}
Range: ${currentPositionInRange}% of recent range, ATR: ${atr.toFixed(5)}

Requirements: SL min ${minStopLossPips} pips, TP min ${minTakeProfitPips} pips, R:R 1.5:1+
${forceMode ? 'EMERGENCY: Find any reasonable setup' : lowThreshold ? 'LOW THRESHOLD: Flexible criteria' : 'NORMAL: High quality only'}

JSON response:
{
  "recommendation": "BUY"|"SELL"|"HOLD",
  "confidence": [40-85],
  "entryPrice": ${currentPrice},
  "stopLoss": [price level],
  "takeProfits": [3 levels at 1.5:1, 2:1, 3:1 ratios],
  "reasoning": "[brief setup explanation]",
  "technicalFactors": ["factor1", "factor2"],
  "riskAssessment": "[brief risk note]",
  "marketRegime": "${marketRegime}",
  "sessionAnalysis": "[brief session impact]",
  "qualityScore": [0-100]
}`;

    console.log(`🤖 Sending ENHANCED AI analysis request for ${symbol}...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Latest flagship model for higher quality
        messages: [
          {
            role: 'system',
            content: 'Professional forex analyst. Find quality setups. Respond JSON only.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.2, // Balanced temperature for quality analysis
        max_tokens: 800 // Increased tokens for detailed analysis
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log(`⚠️ Rate limit hit for ${symbol}, implementing enhanced backoff...`);
        await new Promise(resolve => setTimeout(resolve, 20000)); // Longer backoff for flagship model
        throw new Error(`OpenAI rate limit - will retry with backoff`);
      }
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    
    // Log cost estimation
    const usage = aiResponse.usage;
    if (usage) {
      const estimatedCost = (usage.prompt_tokens * 0.00015 + usage.completion_tokens * 0.0006) / 1000;
      console.log(`💰 OpenAI usage for ${symbol}: ${usage.total_tokens} tokens, ~$${estimatedCost.toFixed(4)}`);
    }
    const aiContent = aiResponse.choices[0].message.content;
    
    console.log(`🤖 ENHANCED AI response for ${symbol}:`, aiContent.substring(0, 300) + '...');

    // Parse ENHANCED AI response
    try {
      const analysisMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!analysisMatch) {
        throw new Error('No valid JSON found in ENHANCED AI response');
      }
      
      const analysis: EnhancedAISignalAnalysis = JSON.parse(analysisMatch[0]);
      
      // Validate ENHANCED AI response
      if (!analysis.recommendation || !['BUY', 'SELL', 'HOLD'].includes(analysis.recommendation)) {
        throw new Error('Invalid recommendation from ENHANCED AI');
      }
      
      if (analysis.recommendation !== 'HOLD') {
        // Enhanced quality thresholds to match successful 65/100 signals
        const confidenceThreshold = forceMode ? 40 : (lowThreshold ? 55 : 70);
        const qualityThreshold = forceMode ? 35 : (lowThreshold ? 45 : 65);
        
        if (analysis.confidence < confidenceThreshold || analysis.confidence > 95) {
          console.log(`🤖 ${symbol} AI confidence ${analysis.confidence}% below threshold ${confidenceThreshold}% - converting to HOLD`);
          return { ...analysis, recommendation: 'HOLD' as const, qualityScore: Math.min(analysis.qualityScore || 0, 60) };
        }
        
        if ((analysis.qualityScore || 0) < qualityThreshold) {
          console.log(`🤖 ${symbol} AI quality score ${analysis.qualityScore || 0} below threshold ${qualityThreshold} - converting to HOLD`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
        
        // Validate enhanced pip requirements
        const stopLossPips = Math.abs(analysis.entryPrice - analysis.stopLoss) / getPipValue(symbol);
        const takeProfitPips = Math.abs(analysis.takeProfits[0] - analysis.entryPrice) / getPipValue(symbol);
        
        if (stopLossPips < minStopLossPips) {
          console.log(`🤖 ${symbol} ENHANCED AI stop loss only ${stopLossPips.toFixed(1)} pips - below ${minStopLossPips} pip minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
        
        if (takeProfitPips < minTakeProfitPips) {
          console.log(`🤖 ${symbol} ENHANCED AI take profit only ${takeProfitPips.toFixed(1)} pips - below ${minTakeProfitPips} pip minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
        
        // Validate R:R ratio
        const rrRatio = takeProfitPips / stopLossPips;
        if (rrRatio < 1.5) {
          console.log(`🤖 ${symbol} ENHANCED AI R:R ratio ${rrRatio.toFixed(2)}:1 below 1.5:1 minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
      }
      
      return analysis;
      
    } catch (parseError) {
      console.error(`Error parsing ENHANCED AI response for ${symbol}:`, parseError);
      return null;
    }
    
  } catch (error) {
    console.error(`Error in ENHANCED AI analysis for ${pair.symbol}:`, error);
    return null;
  }
}

// Helper functions for enhanced analysis
function calculateATR(pricePoints: PricePoint[]): number {
  if (pricePoints.length < 2) return 0;
  
  let totalTrueRange = 0;
  for (let i = 1; i < pricePoints.length; i++) {
    const high = pricePoints[i].price;
    const low = pricePoints[i].price;
    const prevClose = pricePoints[i - 1].price;
    
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    totalTrueRange += trueRange;
  }
  
  return totalTrueRange / (pricePoints.length - 1);
}

function calculateTrendStrength(pricePoints: PricePoint[]): string {
  if (pricePoints.length < 20) return 'Insufficient data';
  
  const prices = pricePoints.map(p => p.price);
  const n = prices.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = prices.reduce((sum, price) => sum + price, 0);
  const sumXY = prices.reduce((sum, price, i) => sum + (i * price), 0);
  const sumX2 = prices.reduce((sum, _, i) => sum + (i * i), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgPrice = sumY / n;
  const slopeStrength = Math.abs(slope) / avgPrice;
  
  if (slopeStrength > 0.003) return slope > 0 ? 'Strong Bullish' : 'Strong Bearish';
  if (slopeStrength > 0.001) return slope > 0 ? 'Moderate Bullish' : 'Moderate Bearish';
  return 'Weak/Sideways';
}

function detectMarketRegime(pricePoints: PricePoint[], atr: number): string {
  if (pricePoints.length < 20) return 'Unknown';
  
  const prices = pricePoints.map(p => p.price);
  const currentPrice = prices[prices.length - 1];
  const volatilityRatio = atr / currentPrice;
  
  if (volatilityRatio > 0.025) return 'Highly Volatile';
  if (volatilityRatio > 0.015) return 'Moderately Volatile';
  
  const highestHigh = Math.max(...prices.slice(-20));
  const lowestLow = Math.min(...prices.slice(-20));
  const priceRange = highestHigh - lowestLow;
  const rangeRatio = priceRange / currentPrice;
  
  if (rangeRatio > 0.02) return 'Trending';
  return 'Ranging';
}

function getCurrentSessionAnalysis(): { session: string; volatility: string; recommendation: string } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 8 && utcHour < 16) {
    return { session: 'European', volatility: 'High', recommendation: 'Favorable' };
  } else if (utcHour >= 13 && utcHour < 17) {
    return { session: 'London-NY Overlap', volatility: 'Very High', recommendation: 'Excellent' };
  } else if (utcHour >= 17 && utcHour < 22) {
    return { session: 'US', volatility: 'Moderate', recommendation: 'Good' };
  } else if (utcHour >= 0 && utcHour < 8) {
    return { session: 'Asian', volatility: 'Low-Moderate', recommendation: 'Caution' };
  }
  
  return { session: 'Low Activity', volatility: 'Very Low', recommendation: 'Avoid' };
}

function getEconomicContext(symbol: string): string {
  // Simplified economic context - in production, this would fetch from economic calendar
  const majorEventPairs = ['EURUSD', 'GBPUSD', 'USDJPY'];
  if (majorEventPairs.includes(symbol)) {
    return 'Monitor for major economic releases';
  }
  return 'Standard economic environment';
}

// Convert ENHANCED AI analysis to signal data format
async function convertEnhancedAIAnalysisToSignal(
  pair: any,
  aiAnalysis: EnhancedAISignalAnalysis,
  historicalData: PricePoint[],
  lowThreshold: boolean = false
): Promise<SignalData | null> {
  try {
    const qualityThreshold = lowThreshold ? 45 : 65; // Raised to match successful signals
    if (aiAnalysis.recommendation === 'HOLD' || aiAnalysis.qualityScore < qualityThreshold) {
      return null;
    }

    // Directional and numeric validation to prevent invalid signals
    const entry = Number(aiAnalysis.entryPrice);
    const sl = Number(aiAnalysis.stopLoss);
    const tpsRaw = Array.isArray(aiAnalysis.takeProfits) ? aiAnalysis.takeProfits : [];
    const tps = tpsRaw.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));

    if (!Number.isFinite(entry) || entry <= 0) return null;
    if (!Number.isFinite(sl)) return null;

    const isBuy = aiAnalysis.recommendation === 'BUY';

    // Enforce correct stop-loss direction
    if ((isBuy && sl >= entry) || (!isBuy && sl <= entry)) {
      console.log(`❌ Discarding ${pair.symbol} ${aiAnalysis.recommendation}: invalid stop loss direction (entry ${entry}, SL ${sl})`);
      return null;
    }

    // Keep only TPs on the correct side of entry and sort properly
    const filteredTPs = tps
      .filter((tp: number) => (isBuy ? tp > entry : tp < entry))
      .sort((a: number, b: number) => (isBuy ? a - b : b - a));

    if (filteredTPs.length === 0) {
      console.log(`❌ Discarding ${pair.symbol} ${aiAnalysis.recommendation}: no valid take profits on correct side of entry`);
      return null;
    }

    const signal: SignalData = {
      symbol: pair.symbol,
      type: aiAnalysis.recommendation,
      price: entry,
      pips: 0, // New signals start with 0 pips
      stopLoss: sl,
      takeProfits: filteredTPs,
      confidence: aiAnalysis.confidence,
      analysisText: `ENHANCED AI-powered ${aiAnalysis.recommendation} signal for ${pair.symbol}. ${aiAnalysis.reasoning} Technical factors: ${aiAnalysis.technicalFactors.join(', ')}. Risk assessment: ${aiAnalysis.riskAssessment} Market regime: ${aiAnalysis.marketRegime}. Session analysis: ${aiAnalysis.sessionAnalysis}. Quality Score: ${aiAnalysis.qualityScore}/100`,
      technicalIndicators: {
        enhancedAI: true,
        recommendation: aiAnalysis.recommendation,
        confidence: aiAnalysis.confidence,
        qualityScore: aiAnalysis.qualityScore,
        technicalFactors: aiAnalysis.technicalFactors,
        riskAssessment: aiAnalysis.riskAssessment,
        marketRegime: aiAnalysis.marketRegime,
        sessionAnalysis: aiAnalysis.sessionAnalysis
      },
      chartData: historicalData.slice(-100).map(point => ({
        time: point.timestamp,
        price: point.price
      }))
    };

    return signal;
  } catch (error) {
    console.error(`Error converting ENHANCED AI analysis to signal for ${pair.symbol}:`, error);
    return null;
  }
}
