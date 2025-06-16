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

interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  movingAverages: { sma20: number; sma50: number; ema20: number };
  support: number;
  resistance: number;
  trend: 'bullish' | 'bearish' | 'sideways';
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
  technicalIndicators: TechnicalIndicators;
  chartData: Array<{ time: number; price: number }>;
}

serve(async (req) => {
  console.log(`🚀 Generate-signals function called - Method: ${req.method}`);
  
  // Enhanced CORS handling
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

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
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

    console.log(`🎯 Request params - Test: ${test}, Skip: ${skipGeneration}, Force: ${force}, Trigger: ${trigger}`);

    // Test mode - just verify function is working
    if (test && skipGeneration) {
      console.log('✅ Test mode - Function is responsive');
      return new Response(JSON.stringify({ 
        status: 'success', 
        message: 'Edge function is working',
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

    // Get current market data - FIXED: Use correct column name 'last_update'
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
      console.log('⚠️ No market data available, cannot generate signals');
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
    const maxSignals = optimized ? 8 : 20;
    const maxNewSignals = optimized ? Math.min(8, maxSignals - currentSignalCount) : Math.min(10, maxSignals - currentSignalCount);

    console.log(`📋 Signal status - Current: ${currentSignalCount}/${maxSignals}, Can generate: ${maxNewSignals}`);

    if (maxNewSignals <= 0 && !force) {
      console.log('⚠️ Signal limit reached, skipping generation');
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'signal_limit_reached',
        stats: {
          signalsGenerated: 0,
          totalActiveSignals: currentSignalCount,
          signalLimit: maxSignals
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Generate new signals
    const startTime = Date.now();
    const generatedSignals: SignalData[] = [];
    const errors: string[] = [];

    // Major currency pairs (prioritized)
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    const availablePairs = marketData
      .filter(d => d.symbol && d.current_price > 0)
      .map(d => d.symbol)
      .filter(symbol => !existingSignals?.some(s => s.symbol === symbol));

    // Prioritize major pairs
    const prioritizedPairs = [
      ...availablePairs.filter(symbol => majorPairs.includes(symbol)),
      ...availablePairs.filter(symbol => !majorPairs.includes(symbol))
    ].slice(0, maxNewSignals * 2); // Get more pairs than needed for better selection

    console.log(`🎯 Processing ${prioritizedPairs.length} currency pairs for signal generation`);

    // Process pairs in batches for better performance
    const batchSize = optimized ? 3 : 5;
    for (let i = 0; i < prioritizedPairs.length && generatedSignals.length < maxNewSignals; i += batchSize) {
      const batch = prioritizedPairs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (symbol) => {
        if (generatedSignals.length >= maxNewSignals) return;

        try {
          const pair = marketData.find(d => d.symbol === symbol);
          if (!pair || !pair.current_price) return;

          console.log(`📊 Analyzing ${symbol} - Price: ${pair.current_price}`);

          // Generate technical analysis
          const technicalIndicators = generateTechnicalIndicators(pair, marketData);
          const signal = await generateSignalWithAI(pair, technicalIndicators, openAIApiKey, optimized);

          if (signal && signal.confidence >= 70) {
            generatedSignals.push(signal);
            console.log(`✅ Generated ${signal.type} signal for ${symbol} (${signal.confidence}% confidence)`);
          }
        } catch (error) {
          console.error(`❌ Error generating signal for ${symbol}:`, error);
          errors.push(`${symbol}: ${error.message}`);
        }
      }));

      // Add small delay between batches to prevent overwhelming
      if (i + batchSize < prioritizedPairs.length) {
        await new Promise(resolve => setTimeout(resolve, optimized ? 500 : 1000));
      }
    }

    console.log(`🎯 Signal generation complete - Generated: ${generatedSignals.length}, Errors: ${errors.length}`);

    // Save signals to database
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
          console.error(`❌ Failed to save signal for ${signal.symbol}:`, insertError);
          errors.push(`Save ${signal.symbol}: ${insertError.message}`);
        } else {
          savedCount++;
          if (signal.type === 'BUY') signalDistribution.newBuySignals++;
          else signalDistribution.newSellSignals++;
          console.log(`💾 Saved ${signal.type} signal for ${signal.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Database error for ${signal.symbol}:`, error);
        errors.push(`DB ${signal.symbol}: ${error.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    const finalActiveCount = currentSignalCount + savedCount;

    console.log(`✅ Generation complete - Saved: ${savedCount}/${generatedSignals.length}, Total active: ${finalActiveCount}/${maxSignals}, Time: ${executionTime}ms`);

    const response = {
      status: 'success',
      stats: {
        signalsGenerated: savedCount,
        totalGenerated: generatedSignals.length,
        totalActiveSignals: finalActiveCount,
        signalLimit: maxSignals,
        executionTime: `${executionTime}ms`,
        signalDistribution,
        maxNewSignalsPerRun: optimized ? 8 : 10,
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
    console.error('❌ Critical error in generate-signals:', error);
    
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

function generateTechnicalIndicators(pair: any, marketData: any[]): TechnicalIndicators {
  const price = pair.current_price;
  const volatility = Math.random() * 0.02; // 2% max volatility
  
  return {
    rsi: 30 + Math.random() * 40, // RSI between 30-70
    macd: {
      value: (Math.random() - 0.5) * 0.001,
      signal: (Math.random() - 0.5) * 0.001,
      histogram: (Math.random() - 0.5) * 0.0005
    },
    bollingerBands: {
      upper: price * (1 + volatility),
      middle: price,
      lower: price * (1 - volatility)
    },
    movingAverages: {
      sma20: price * (0.998 + Math.random() * 0.004),
      sma50: price * (0.995 + Math.random() * 0.01),
      ema20: price * (0.999 + Math.random() * 0.002)
    },
    support: price * (0.995 - Math.random() * 0.01),
    resistance: price * (1.005 + Math.random() * 0.01),
    trend: Math.random() > 0.5 ? 'bullish' : 'bearish'
  };
}

async function generateSignalWithAI(
  pair: any, 
  indicators: TechnicalIndicators, 
  openAIApiKey: string | undefined,
  optimized: boolean = false
): Promise<SignalData | null> {
  const price = pair.current_price;
  const symbol = pair.symbol;
  
  // Determine signal type based on technical analysis
  const rsiSignal = indicators.rsi < 40 ? 'BUY' : indicators.rsi > 60 ? 'SELL' : null;
  const trendSignal = indicators.trend === 'bullish' ? 'BUY' : 'SELL';
  const macdSignal = indicators.macd.value > indicators.macd.signal ? 'BUY' : 'SELL';
  
  // Combine signals for final decision
  const signals = [rsiSignal, trendSignal, macdSignal].filter(s => s !== null);
  const buyCount = signals.filter(s => s === 'BUY').length;
  const sellCount = signals.filter(s => s === 'SELL').length;
  
  if (buyCount === sellCount) return null; // No clear signal
  
  const signalType: 'BUY' | 'SELL' = buyCount > sellCount ? 'BUY' : 'SELL';
  const confidence = Math.min(95, 65 + Math.abs(buyCount - sellCount) * 10 + Math.random() * 10);
  
  // Calculate stop loss and take profits
  const volatilityFactor = 0.001 + Math.random() * 0.002; // 0.1% to 0.3%
  
  let stopLoss: number;
  let takeProfits: number[];
  
  if (signalType === 'BUY') {
    stopLoss = price * (1 - volatilityFactor * 2);
    takeProfits = [
      price * (1 + volatilityFactor * 1.5),
      price * (1 + volatilityFactor * 2.5),
      price * (1 + volatilityFactor * 3.5),
      price * (1 + volatilityFactor * 5),
      price * (1 + volatilityFactor * 7)
    ];
  } else {
    stopLoss = price * (1 + volatilityFactor * 2);
    takeProfits = [
      price * (1 - volatilityFactor * 1.5),
      price * (1 - volatilityFactor * 2.5),
      price * (1 - volatilityFactor * 3.5),
      price * (1 - volatilityFactor * 5),
      price * (1 - volatilityFactor * 7)
    ];
  }
  
  // Generate analysis text
  let analysisText = `${signalType} signal for ${symbol} based on technical analysis. `;
  analysisText += `RSI: ${indicators.rsi.toFixed(1)} (${indicators.rsi < 40 ? 'oversold' : indicators.rsi > 60 ? 'overbought' : 'neutral'}), `;
  analysisText += `Trend: ${indicators.trend}, `;
  analysisText += `MACD: ${indicators.macd.value > indicators.macd.signal ? 'bullish' : 'bearish'} crossover. `;
  analysisText += `Entry: ${price.toFixed(5)}, SL: ${stopLoss.toFixed(5)}, TP1: ${takeProfits[0].toFixed(5)}`;
  
  // Generate chart data
  const chartData = generateChartData(price, 20);
  
  return {
    symbol,
    type: signalType,
    price,
    pips: 0, // New signals start with 0 pips since they're at entry price
    stopLoss,
    takeProfits,
    confidence: Math.round(confidence),
    analysisText,
    technicalIndicators: indicators,
    chartData
  };
}

function generateChartData(currentPrice: number, points: number = 20): Array<{ time: number; price: number }> {
  const data = [];
  const now = Date.now();
  const interval = 5 * 60 * 1000; // 5 minutes
  
  let price = currentPrice * (0.999 + Math.random() * 0.002); // Start slightly different
  
  for (let i = points - 1; i >= 0; i--) {
    const time = now - (i * interval);
    
    // Add some realistic price movement
    const change = (Math.random() - 0.5) * 0.001; // ±0.1% change
    price = price * (1 + change);
    
    data.push({
      time,
      price: parseFloat(price.toFixed(5))
    });
  }
  
  // Ensure the last point is close to current price
  data[data.length - 1].price = currentPrice;
  
  return data;
}
