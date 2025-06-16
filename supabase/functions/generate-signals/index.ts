
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
  validationScore: number;
  confirmations: string[];
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

interface PricePoint {
  timestamp: number;
  price: number;
}

interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
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

          // Get real historical price data
          const historicalData = await getHistoricalPriceData(supabase, symbol);
          if (!historicalData || historicalData.length < 50) {
            console.log(`⚠️ Insufficient historical data for ${symbol}: ${historicalData?.length || 0} points`);
            return;
          }

          // Generate real technical analysis
          const technicalIndicators = await generateRealTechnicalIndicators(historicalData, pair.current_price);
          
          // Only proceed if technical analysis is valid
          if (technicalIndicators.validationScore < 3) {
            console.log(`❌ ${symbol} failed technical validation (score: ${technicalIndicators.validationScore})`);
            return;
          }

          const signal = await generateRealSignal(pair, technicalIndicators, historicalData);

          if (signal && signal.confidence >= 70) {
            generatedSignals.push(signal);
            console.log(`✅ Generated ${signal.type} signal for ${symbol} (${signal.confidence}% confidence, validation: ${technicalIndicators.validationScore})`);
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

// Get real historical price data from the database
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

// Convert price points to OHLCV data
function generateOHLCVFromPrices(priceData: PricePoint[]): OHLCVData[] {
  if (priceData.length === 0) return [];
  
  // Group prices by hour to create candlesticks
  const hourlyData: { [key: string]: number[] } = {};
  
  priceData.forEach(point => {
    const hourKey = Math.floor(point.timestamp / (60 * 60 * 1000)) * 60 * 60 * 1000;
    if (!hourlyData[hourKey]) hourlyData[hourKey] = [];
    hourlyData[hourKey].push(point.price);
  });
  
  return Object.entries(hourlyData).map(([timestamp, prices]) => ({
    timestamp: parseInt(timestamp),
    open: prices[0],
    high: Math.max(...prices),
    low: Math.min(...prices),
    close: prices[prices.length - 1],
    volume: prices.length
  })).sort((a, b) => a.timestamp - b.timestamp);
}

// Real technical analysis using actual price data
async function generateRealTechnicalIndicators(historicalData: PricePoint[], currentPrice: number): Promise<TechnicalIndicators> {
  const closes = historicalData.map(d => d.price);
  const ohlcvData = generateOHLCVFromPrices(historicalData);
  
  // Calculate real RSI
  const rsi = calculateRSI(closes, 14);
  
  // Calculate real MACD
  const macdData = calculateMACD(closes);
  
  // Calculate real Bollinger Bands
  const bbData = calculateBollingerBands(closes, 20, 2);
  
  // Calculate real moving averages
  const ema20 = calculateEMA(closes, 20);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  
  // Calculate real support and resistance from price action
  const { support, resistance } = calculateSupportResistance(closes);
  
  // Determine trend based on moving averages
  const trend = currentPrice > sma20 && sma20 > sma50 ? 'bullish' : 
               currentPrice < sma20 && sma20 < sma50 ? 'bearish' : 'sideways';
  
  // Calculate validation score based on technical confluence
  let validationScore = 0;
  const confirmations: string[] = [];
  
  // RSI validation
  if (rsi < 30) {
    validationScore += 2;
    confirmations.push('RSI Oversold');
  } else if (rsi > 70) {
    validationScore += 2;
    confirmations.push('RSI Overbought');
  } else if (rsi > 40 && rsi < 60) {
    validationScore += 1;
    confirmations.push('RSI Neutral');
  }
  
  // MACD validation
  if (macdData.value > macdData.signal && macdData.histogram > 0) {
    validationScore += 2;
    confirmations.push('MACD Bullish');
  } else if (macdData.value < macdData.signal && macdData.histogram < 0) {
    validationScore += 2;
    confirmations.push('MACD Bearish');
  }
  
  // Bollinger Bands validation
  if (currentPrice < bbData.lower) {
    validationScore += 1.5;
    confirmations.push('Below BB Lower');
  } else if (currentPrice > bbData.upper) {
    validationScore += 1.5;
    confirmations.push('Above BB Upper');
  }
  
  // Trend validation
  if (trend !== 'sideways') {
    validationScore += 1;
    confirmations.push(`${trend} trend`);
  }
  
  // Support/Resistance validation
  const priceNearSupport = Math.abs(currentPrice - support) / currentPrice < 0.005;
  const priceNearResistance = Math.abs(currentPrice - resistance) / currentPrice < 0.005;
  
  if (priceNearSupport) {
    validationScore += 1;
    confirmations.push('Near Support');
  } else if (priceNearResistance) {
    validationScore += 1;
    confirmations.push('Near Resistance');
  }

  return {
    rsi,
    macd: {
      value: macdData.value,
      signal: macdData.signal,
      histogram: macdData.histogram
    },
    bollingerBands: {
      upper: bbData.upper,
      middle: bbData.middle,
      lower: bbData.lower
    },
    movingAverages: {
      sma20,
      sma50,
      ema20
    },
    support,
    resistance,
    trend,
    validationScore,
    confirmations
  };
}

// Generate real signals based on technical analysis
async function generateRealSignal(
  pair: any, 
  indicators: TechnicalIndicators, 
  historicalData: PricePoint[]
): Promise<SignalData | null> {
  const price = pair.current_price;
  const symbol = pair.symbol;
  
  // Determine signal type based on real technical analysis
  let signalType: 'BUY' | 'SELL' | null = null;
  let signalStrength = 0;
  
  // RSI-based signals
  if (indicators.rsi < 30 && indicators.trend === 'bullish') {
    signalType = 'BUY';
    signalStrength += 3;
  } else if (indicators.rsi > 70 && indicators.trend === 'bearish') {
    signalType = 'SELL';
    signalStrength += 3;
  }
  
  // MACD confirmation
  if (signalType === 'BUY' && indicators.macd.value > indicators.macd.signal) {
    signalStrength += 2;
  } else if (signalType === 'SELL' && indicators.macd.value < indicators.macd.signal) {
    signalStrength += 2;
  }
  
  // Bollinger Bands confirmation
  if (signalType === 'BUY' && price < indicators.bollingerBands.lower) {
    signalStrength += 2;
  } else if (signalType === 'SELL' && price > indicators.bollingerBands.upper) {
    signalStrength += 2;
  }
  
  // Support/Resistance confirmation
  const nearSupport = Math.abs(price - indicators.support) / price < 0.005;
  const nearResistance = Math.abs(price - indicators.resistance) / price < 0.005;
  
  if (signalType === 'BUY' && nearSupport) {
    signalStrength += 1;
  } else if (signalType === 'SELL' && nearResistance) {
    signalStrength += 1;
  }
  
  // Need minimum signal strength
  if (!signalType || signalStrength < 4) {
    return null;
  }
  
  // Calculate confidence based on signal strength and validation score
  const confidence = Math.min(95, 60 + (signalStrength * 5) + (indicators.validationScore * 2));
  
  // Calculate real ATR for proper stop loss and take profit levels
  const atr = calculateATR(generateOHLCVFromPrices(historicalData));
  const atrMultiplier = 2; // Conservative ATR multiplier
  
  let stopLoss: number;
  let takeProfits: number[];
  
  if (signalType === 'BUY') {
    stopLoss = Math.max(price - (atr * atrMultiplier), indicators.support * 0.999);
    takeProfits = [
      Math.min(price + (atr * 1.5), indicators.resistance * 0.999),
      Math.min(price + (atr * 2.5), indicators.resistance * 1.001),
      price + (atr * 3.5),
      price + (atr * 5),
      price + (atr * 7)
    ];
  } else {
    stopLoss = Math.min(price + (atr * atrMultiplier), indicators.resistance * 1.001);
    takeProfits = [
      Math.max(price - (atr * 1.5), indicators.support * 1.001),
      Math.max(price - (atr * 2.5), indicators.support * 0.999),
      price - (atr * 3.5),
      price - (atr * 5),
      price - (atr * 7)
    ];
  }
  
  // Generate analysis text with real technical context
  let analysisText = `${signalType} signal for ${symbol} based on technical confluence. `;
  analysisText += `RSI: ${indicators.rsi.toFixed(1)} (${indicators.rsi < 30 ? 'oversold' : indicators.rsi > 70 ? 'overbought' : 'neutral'}), `;
  analysisText += `MACD: ${indicators.macd.value > indicators.macd.signal ? 'bullish' : 'bearish'}, `;
  analysisText += `Trend: ${indicators.trend}, `;
  analysisText += `Price vs BB: ${price < indicators.bollingerBands.lower ? 'below lower' : price > indicators.bollingerBands.upper ? 'above upper' : 'within bands'}. `;
  analysisText += `Confirmations: ${indicators.confirmations.join(', ')}. `;
  analysisText += `Entry: ${price.toFixed(5)}, SL: ${stopLoss.toFixed(5)}, TP1: ${takeProfits[0].toFixed(5)}`;
  
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
    chartData: historicalData.slice(-50).map(point => ({
      time: point.timestamp,
      price: point.price
    }))
  };
}

// Technical analysis utility functions
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  if (prices.length < 26) return { value: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // For simplicity, use a basic signal calculation
  const macdSignal = calculateEMA([macdLine], 9);
  const histogram = macdLine - macdSignal;
  
  return { value: macdLine, signal: macdSignal, histogram };
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const recentPrices = prices.slice(-period);
  return recentPrices.reduce((sum, price) => sum + price, 0) / period;
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return { upper: avg, middle: avg, lower: avg };
  }
  
  const recentPrices = prices.slice(-period);
  const middle = recentPrices.reduce((sum, price) => sum + price, 0) / period;
  
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  const upper = middle + (standardDeviation * stdDev);
  const lower = middle - (standardDeviation * stdDev);
  
  return { upper, middle, lower };
}

function calculateSupportResistance(prices: number[]): { support: number; resistance: number } {
  if (prices.length < 20) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { support: min, resistance: max };
  }
  
  // Simple support/resistance calculation based on recent highs and lows
  const recentPrices = prices.slice(-50);
  const sortedPrices = [...recentPrices].sort((a, b) => a - b);
  
  // Support: around 20th percentile
  const supportIndex = Math.floor(sortedPrices.length * 0.2);
  const support = sortedPrices[supportIndex];
  
  // Resistance: around 80th percentile
  const resistanceIndex = Math.floor(sortedPrices.length * 0.8);
  const resistance = sortedPrices[resistanceIndex];
  
  return { support, resistance };
}

function calculateATR(ohlcvData: OHLCVData[], period: number = 14): number {
  if (ohlcvData.length < 2) return 0.001; // Default small ATR
  
  const trueRanges = ohlcvData.slice(1).map((candle, i) => {
    const prevClose = ohlcvData[i].close;
    const highLow = candle.high - candle.low;
    const highClose = Math.abs(candle.high - prevClose);
    const lowClose = Math.abs(candle.low - prevClose);
    
    return Math.max(highLow, highClose, lowClose);
  });
  
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
}
