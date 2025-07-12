
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

interface AISignalAnalysis {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  reasoning: string;
  technicalFactors: string[];
  riskAssessment: string;
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
  console.log(`🚀 AI-powered signal generation called - Method: ${req.method}`);
  
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
      debug = false,
      trigger = 'manual',
      run_id,
      attempt = 1,
      optimized = false
    } = requestBody;

    console.log(`🎯 Request params - Test: ${test}, Skip: ${skipGeneration}, Force: ${force}, Trigger: ${trigger}, AI-powered: true`);

    // Test mode
    if (test && skipGeneration) {
      console.log('✅ Test mode - AI-powered function is responsive');
      return new Response(JSON.stringify({ 
        status: 'success', 
        message: 'AI-powered edge function is working',
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
      console.log('⚠️ No market data available, cannot generate AI signals');
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
    const maxSignals = 20;
    const maxNewSignals = optimized ? Math.min(6, maxSignals - currentSignalCount) : Math.min(8, maxSignals - currentSignalCount);

    console.log(`📋 AI Signal status - Current: ${currentSignalCount}/${maxSignals}, Can generate: ${maxNewSignals}, AI-powered mode`);

    if (maxNewSignals <= 0 && !force) {
      console.log('⚠️ Signal limit reached, skipping AI generation');
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'signal_limit_reached',
        stats: {
          signalsGenerated: 0,
          totalActiveSignals: currentSignalCount,
          signalLimit: maxSignals,
          maxNewSignalsPerRun: optimized ? 6 : 8
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Generate AI-powered signals
    const startTime = Date.now();
    const generatedSignals: SignalData[] = [];
    const errors: string[] = [];

    // Major currency pairs (prioritized for AI analysis)
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    const availablePairs = marketData
      .filter(d => d.symbol && d.current_price > 0)
      .map(d => d.symbol)
      .filter(symbol => !existingSignals?.some(s => s.symbol === symbol));

    // Prioritize major pairs for AI analysis
    const prioritizedPairs = [
      ...availablePairs.filter(symbol => majorPairs.includes(symbol)),
      ...availablePairs.filter(symbol => !majorPairs.includes(symbol))
    ].slice(0, maxNewSignals * 2);

    console.log(`🤖 AI analyzing ${prioritizedPairs.length} currency pairs for signal generation`);

    // Process pairs for AI analysis
    const batchSize = optimized ? 2 : 3; // Smaller batches for AI processing
    for (let i = 0; i < prioritizedPairs.length && generatedSignals.length < maxNewSignals; i += batchSize) {
      const batch = prioritizedPairs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (symbol) => {
        if (generatedSignals.length >= maxNewSignals) return;

        try {
          const pair = marketData.find(d => d.symbol === symbol);
          if (!pair || !pair.current_price) return;

          console.log(`🤖 AI analyzing ${symbol} - Price: ${pair.current_price}`);

          // Get historical price data
          const historicalData = await getHistoricalPriceData(supabase, symbol);
          if (!historicalData || historicalData.length < 50) {
            console.log(`⚠️ Insufficient historical data for AI analysis ${symbol}: ${historicalData?.length || 0} points`);
            return;
          }

          // Generate AI-powered signal analysis
          const aiAnalysis = await generateAISignalAnalysis(openAIApiKey, pair, historicalData);
          
          if (!aiAnalysis || aiAnalysis.recommendation === 'HOLD') {
            console.log(`🤖 ${symbol} AI recommendation: HOLD - No signal generated`);
            return;
          }

          console.log(`🤖 ${symbol} AI recommendation: ${aiAnalysis.recommendation} (${aiAnalysis.confidence}% confidence)`);

          const signal = await convertAIAnalysisToSignal(pair, aiAnalysis, historicalData);

          if (signal && signal.confidence >= 70) {
            generatedSignals.push(signal);
            console.log(`✅ Generated AI ${signal.type} signal for ${symbol} (${signal.confidence}% confidence)`);
          } else {
            console.log(`❌ ${symbol} AI signal generation failed - Low confidence or invalid signal`);
          }
        } catch (error) {
          console.error(`❌ Error in AI analysis for ${symbol}:`, error);
          errors.push(`${symbol}: ${error.message}`);
        }
      }));

      // Add delay between AI batches to respect rate limits
      if (i + batchSize < prioritizedPairs.length) {
        await new Promise(resolve => setTimeout(resolve, optimized ? 800 : 1200));
      }
    }

    console.log(`🤖 AI signal generation complete - Generated: ${generatedSignals.length}, Errors: ${errors.length}`);

    // Save AI-generated signals to database
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
          console.error(`❌ Failed to save AI signal for ${signal.symbol}:`, insertError);
          errors.push(`Save ${signal.symbol}: ${insertError.message}`);
        } else {
          savedCount++;
          if (signal.type === 'BUY') signalDistribution.newBuySignals++;
          else signalDistribution.newSellSignals++;
          console.log(`💾 Saved AI ${signal.type} signal for ${signal.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Database error for ${signal.symbol}:`, error);
        errors.push(`DB ${signal.symbol}: ${error.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    const finalActiveCount = currentSignalCount + savedCount;

    console.log(`✅ AI generation complete - Saved: ${savedCount}/${generatedSignals.length}, Total active: ${finalActiveCount}/${maxSignals}, Time: ${executionTime}ms`);

    const response = {
      status: 'success',
      stats: {
        signalsGenerated: savedCount,
        totalGenerated: generatedSignals.length,
        totalActiveSignals: finalActiveCount,
        signalLimit: maxSignals,
        executionTime: `${executionTime}ms`,
        signalDistribution,
        maxNewSignalsPerRun: optimized ? 6 : 8,
        aiPowered: true,
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
    console.error('❌ Critical error in AI signal generation:', error);
    
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

// Get historical price data from database
async function getHistoricalPriceData(supabase: any, symbol: string): Promise<PricePoint[] | null> {
  try {
    const { data, error } = await supabase
      .from('live_price_history')
      .select('timestamp, price')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: true })
      .limit(200);

    if (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return null;
    }

    if (!data || data.length < 50) {
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

// Generate AI-powered signal analysis using OpenAI
async function generateAISignalAnalysis(
  openAIApiKey: string,
  pair: any,
  historicalData: PricePoint[]
): Promise<AISignalAnalysis | null> {
  try {
    const symbol = pair.symbol;
    const currentPrice = pair.current_price;
    
    // Prepare market data context for AI
    const recentPrices = historicalData.slice(-50);
    const priceChanges = recentPrices.slice(1).map((point, i) => 
      ((point.price - recentPrices[i].price) / recentPrices[i].price * 100).toFixed(4)
    );
    
    const highPrice = Math.max(...recentPrices.map(p => p.price));
    const lowPrice = Math.min(...recentPrices.map(p => p.price));
    const priceRange = highPrice - lowPrice;
    const currentPositionInRange = ((currentPrice - lowPrice) / priceRange * 100).toFixed(1);
    
    // Determine market session
    const now = new Date();
    const utcHour = now.getUTCHours();
    let marketSession = 'Asian';
    if (utcHour >= 8 && utcHour < 16) marketSession = 'European';
    else if (utcHour >= 13 && utcHour < 21) marketSession = 'US';
    
    // Helper functions for pip calculations
    const isJPYPair = (symbol: string): boolean => symbol.includes('JPY');
    const getPipValue = (symbol: string): number => isJPYPair(symbol) ? 0.01 : 0.0001;
    const minStopLossPips = 30;
    const minTakeProfitPips = 15;
    
    const prompt = `You are a professional forex trading analyst. Analyze the following market data for ${symbol} and provide a trading recommendation.

CURRENT MARKET DATA:
- Symbol: ${symbol}
- Current Price: ${currentPrice}
- Market Session: ${marketSession}
- Position in Recent Range: ${currentPositionInRange}% (0% = recent low, 100% = recent high)
- Recent High: ${highPrice}
- Recent Low: ${lowPrice}
- Price Range: ${priceRange.toFixed(5)}

RECENT PRICE MOVEMENTS (last 10 changes in %):
${priceChanges.slice(-10).join(', ')}

TRADING REQUIREMENTS:
- Minimum Stop Loss: ${minStopLossPips} pips (${(minStopLossPips * getPipValue(symbol)).toFixed(5)} price units)
- Minimum Take Profit: ${minTakeProfitPips} pips (${(minTakeProfitPips * getPipValue(symbol)).toFixed(5)} price units)
- Maximum signals allowed: Focus on high-probability setups only

ANALYSIS FRAMEWORK:
1. Price Action: Is price at key support/resistance levels?
2. Momentum: What's the recent directional bias?
3. Market Session: How does current session affect this pair?
4. Risk/Reward: Can we achieve minimum pip requirements with good R:R?

Provide your analysis in this EXACT JSON format:
{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": [number between 70-95],
  "entryPrice": [current price],
  "stopLoss": [price level meeting minimum ${minStopLossPips} pip requirement],
  "takeProfits": [array of 5 price levels, first one meeting minimum ${minTakeProfitPips} pip requirement],
  "reasoning": "[concise explanation of the trade setup]",
  "technicalFactors": ["factor1", "factor2", "factor3"],
  "riskAssessment": "[brief risk evaluation]"
}

Only recommend BUY/SELL if you see a high-probability setup. Use HOLD if conditions are unclear or don't meet minimum requirements.`;

    console.log(`🤖 Sending AI analysis request for ${symbol}...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional forex analyst providing precise trading recommendations. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;
    
    console.log(`🤖 AI response for ${symbol}:`, aiContent.substring(0, 200) + '...');

    // Parse AI response
    try {
      const analysisMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!analysisMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      
      const analysis: AISignalAnalysis = JSON.parse(analysisMatch[0]);
      
      // Validate AI response
      if (!analysis.recommendation || !['BUY', 'SELL', 'HOLD'].includes(analysis.recommendation)) {
        throw new Error('Invalid recommendation from AI');
      }
      
      if (analysis.confidence < 70 || analysis.confidence > 95) {
        throw new Error('AI confidence out of valid range');
      }
      
      // Validate pip requirements
      if (analysis.recommendation !== 'HOLD') {
        const stopLossPips = Math.abs(analysis.entryPrice - analysis.stopLoss) / getPipValue(symbol);
        const takeProfitPips = Math.abs(analysis.takeProfits[0] - analysis.entryPrice) / getPipValue(symbol);
        
        if (stopLossPips < minStopLossPips) {
          console.log(`🤖 ${symbol} AI stop loss only ${stopLossPips.toFixed(1)} pips - below ${minStopLossPips} pip minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
        
        if (takeProfitPips < minTakeProfitPips) {
          console.log(`🤖 ${symbol} AI take profit only ${takeProfitPips.toFixed(1)} pips - below ${minTakeProfitPips} pip minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
      }
      
      return analysis;
      
    } catch (parseError) {
      console.error(`Error parsing AI response for ${symbol}:`, parseError);
      return null;
    }
    
  } catch (error) {
    console.error(`Error in AI analysis for ${pair.symbol}:`, error);
    return null;
  }
}

// Convert AI analysis to signal data format
async function convertAIAnalysisToSignal(
  pair: any,
  aiAnalysis: AISignalAnalysis,
  historicalData: PricePoint[]
): Promise<SignalData | null> {
  try {
    if (aiAnalysis.recommendation === 'HOLD') {
      return null;
    }

    const signal: SignalData = {
      symbol: pair.symbol,
      type: aiAnalysis.recommendation,
      price: aiAnalysis.entryPrice,
      pips: 0, // New signals start with 0 pips
      stopLoss: aiAnalysis.stopLoss,
      takeProfits: aiAnalysis.takeProfits,
      confidence: aiAnalysis.confidence,
      analysisText: `AI-powered ${aiAnalysis.recommendation} signal for ${pair.symbol}. ${aiAnalysis.reasoning} Technical factors: ${aiAnalysis.technicalFactors.join(', ')}. Risk assessment: ${aiAnalysis.riskAssessment}`,
      technicalIndicators: {
        aiAnalysis: true,
        recommendation: aiAnalysis.recommendation,
        confidence: aiAnalysis.confidence,
        technicalFactors: aiAnalysis.technicalFactors,
        riskAssessment: aiAnalysis.riskAssessment
      },
      chartData: historicalData.slice(-50).map(point => ({
        time: point.timestamp,
        price: point.price
      }))
    };

    return signal;
  } catch (error) {
    console.error(`Error converting AI analysis to signal for ${pair.symbol}:`, error);
    return null;
  }
}
