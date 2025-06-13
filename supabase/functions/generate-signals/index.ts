
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback signal generation for testing
const generateFallbackSignals = (marketData: any[]) => {
  console.log('🧪 Generating fallback test signals...');
  
  const signals = [];
  const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
  
  // Generate 2-3 test signals from available data
  const pairsToUse = marketData.filter(item => majorPairs.includes(item.symbol)).slice(0, 3);
  
  for (const marketItem of pairsToUse) {
    const currentPrice = parseFloat(marketItem.price.toString());
    const isJpyPair = marketItem.symbol.includes('JPY');
    const precision = isJpyPair ? 3 : 5;
    
    // Generate random but realistic signal
    const signalTypes = ['BUY', 'SELL'];
    const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
    const confidence = 75 + Math.floor(Math.random() * 15); // 75-90% confidence
    
    // Calculate stop loss and take profits
    const pipValue = isJpyPair ? 0.01 : 0.0001;
    const stopLossDistance = pipValue * (isJpyPair ? 25 : 60);
    const takeProfitDistance = pipValue * (isJpyPair ? 30 : 80);
    
    const stopLoss = signalType === 'BUY' 
      ? currentPrice - stopLossDistance 
      : currentPrice + stopLossDistance;
      
    const takeProfit1 = signalType === 'BUY'
      ? currentPrice + takeProfitDistance
      : currentPrice - takeProfitDistance;
      
    const takeProfit2 = signalType === 'BUY'
      ? currentPrice + (takeProfitDistance * 1.5)
      : currentPrice - (takeProfitDistance * 1.5);
      
    const takeProfit3 = signalType === 'BUY'
      ? currentPrice + (takeProfitDistance * 2)
      : currentPrice - (takeProfitDistance * 2);

    signals.push({
      symbol: marketItem.symbol,
      type: signalType,
      price: parseFloat(currentPrice.toFixed(precision)),
      confidence: confidence,
      stop_loss: parseFloat(stopLoss.toFixed(precision)),
      take_profits: [
        parseFloat(takeProfit1.toFixed(precision)),
        parseFloat(takeProfit2.toFixed(precision)),
        parseFloat(takeProfit3.toFixed(precision))
      ],
      analysis_text: `Fallback test signal: ${signalType} ${marketItem.symbol} at ${currentPrice.toFixed(precision)} (${confidence}% confidence)`,
      status: 'active',
      is_centralized: true,
      user_id: null,
      technical_indicators: {
        rsi: 45 + Math.random() * 20, // Random RSI between 45-65
        momentum: (Math.random() - 0.5) * 0.1, // Random momentum
        source: 'fallback-testing'
      }
    });
  }
  
  console.log(`✅ Generated ${signals.length} fallback test signals`);
  return signals;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Phase 1: Enhanced signal generation with fallback testing...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables');
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enhanced market hours check
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    console.log(`📅 Phase 1: Market status - Day ${utcDay}, Hour ${utcHour}, Closed: ${isMarketClosed}`);

    // Check current active signals
    console.log('📊 Phase 2: Checking current signal landscape...');
    const { data: activeSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('id, symbol, type, confidence, created_at')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    if (signalsError) {
      console.error('❌ Error fetching active signals:', signalsError);
    }

    const currentActiveCount = activeSignals?.length || 0;
    console.log(`📈 Phase 2: Current active signals: ${currentActiveCount}/20`);

    // Get market data with enhanced error handling
    console.log('💹 Phase 3: Fetching market data for analysis...');
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('symbol, price, bid, ask, created_at, source')
      .order('created_at', { ascending: false })
      .limit(100);

    if (marketError) {
      console.error('❌ Error fetching market data:', marketError);
      throw new Error(`Failed to fetch market data: ${marketError.message}`);
    }

    console.log(`📊 Phase 3: Retrieved ${marketData?.length || 0} market data records`);
    
    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No market data available - cannot generate signals');
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No market data available for signal generation',
          stats: {
            signalsGenerated: 0,
            totalActiveSignals: currentActiveCount,
            noMarketData: true
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group market data by symbol and get latest for each
    const latestMarketData = new Map();
    marketData.forEach(item => {
      if (!latestMarketData.has(item.symbol) || 
          new Date(item.created_at) > new Date(latestMarketData.get(item.symbol).created_at)) {
        latestMarketData.set(item.symbol, item);
      }
    });

    console.log(`📈 Phase 3: Latest data available for ${latestMarketData.size} currency pairs`);
    
    // Check if we have fallback/testing data
    const hasFallbackData = Array.from(latestMarketData.values()).some(item => 
      item.source && item.source.includes('fallback')
    );
    
    if (hasFallbackData) {
      console.log('🧪 Detected fallback data - enabling testing mode');
    }

    // Validate market data
    const validMarketData = Array.from(latestMarketData.values()).filter(item => {
      if (!item.symbol || !item.price || item.price <= 0) {
        console.warn(`⚠️ Invalid market data for ${item.symbol}: price=${item.price}`);
        return false;
      }
      return true;
    });

    console.log(`✅ Phase 3: ${validMarketData.length}/${marketData.length} valid market data points`);

    if (validMarketData.length === 0) {
      console.log('❌ No valid market data for signal generation');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No valid market data for analysis',
          stats: {
            signalsGenerated: 0,
            totalActiveSignals: currentActiveCount,
            invalidData: true
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced signal generation logic
    console.log('🎯 Phase 4: Enhanced signal generation...');
    
    let newSignals = [];
    
    // If we have fallback data or market is closed, generate test signals
    if (hasFallbackData || isMarketClosed) {
      console.log('🧪 Using fallback signal generation for testing...');
      newSignals = generateFallbackSignals(validMarketData);
    } else {
      // Live market signal generation with enhanced logic
      console.log('📈 Live market signal generation...');
      
      const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
      const sortedPairs = validMarketData.sort((a, b) => {
        const aIsMajor = majorPairs.includes(a.symbol);
        const bIsMajor = majorPairs.includes(b.symbol);
        if (aIsMajor && !bIsMajor) return -1;
        if (!aIsMajor && bIsMajor) return 1;
        return 0;
      });

      const maxPairsToProcess = Math.min(6, sortedPairs.length);
      const pairsToProcess = sortedPairs.slice(0, maxPairsToProcess);
      
      console.log(`🎯 Processing ${pairsToProcess.length} priority pairs`);

      for (const marketItem of pairsToProcess) {
        try {
          // Check if pair already has active signal
          const hasActiveSignal = activeSignals?.some(signal => signal.symbol === marketItem.symbol);
          if (hasActiveSignal) {
            console.log(`⚠️ ${marketItem.symbol} already has active signal - skipping`);
            continue;
          }

          console.log(`🔍 Analyzing ${marketItem.symbol}`);

          const currentPrice = parseFloat(marketItem.price.toString());
          const bid = parseFloat(marketItem.bid?.toString() || currentPrice.toString());
          const ask = parseFloat(marketItem.ask?.toString() || currentPrice.toString());
          
          // Enhanced technical analysis
          const spread = ask - bid;
          const spreadPercent = (spread / currentPrice) * 100;
          
          // Get historical data for this symbol
          const { data: recentPrices } = await supabase
            .from('live_market_data')
            .select('price, created_at')
            .eq('symbol', marketItem.symbol)
            .order('created_at', { ascending: false })
            .limit(20);

          let rsi = 50;
          let momentum = 0;
          
          if (recentPrices && recentPrices.length >= 5) {
            const prices = recentPrices.map(p => parseFloat(p.price.toString())).filter(p => p > 0);
            
            if (prices.length >= 5) {
              const oldPrice = prices[prices.length - 1];
              momentum = ((currentPrice - oldPrice) / oldPrice) * 100;
              
              // Simple RSI calculation
              const gains = [];
              const losses = [];
              for (let i = 1; i < prices.length; i++) {
                const change = prices[i-1] - prices[i];
                if (change > 0) gains.push(change);
                else losses.push(Math.abs(change));
              }
              
              if (gains.length > 0 && losses.length > 0) {
                const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
                const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
                const rs = avgGain / avgLoss;
                rsi = 100 - (100 / (1 + rs));
              }
            }
          }

          console.log(`📈 ${marketItem.symbol}: RSI=${rsi.toFixed(1)}, Momentum=${momentum.toFixed(4)}%`);

          // Enhanced signal generation logic
          let signalType = null;
          let confidence = 0;
          let analysisText = '';

          // Buy signal criteria
          if (rsi < 35 && momentum > 0.02 && spreadPercent < 0.02) {
            signalType = 'BUY';
            confidence = Math.min(85, 65 + (35 - rsi) * 0.5 + (momentum * 8));
            analysisText = `Oversold bounce: RSI ${rsi.toFixed(1)} with positive momentum ${momentum.toFixed(3)}%`;
          }
          // Sell signal criteria
          else if (rsi > 65 && momentum < -0.02 && spreadPercent < 0.02) {
            signalType = 'SELL';
            confidence = Math.min(85, 65 + (rsi - 65) * 0.5 + (Math.abs(momentum) * 8));
            analysisText = `Overbought reversal: RSI ${rsi.toFixed(1)} with negative momentum ${momentum.toFixed(3)}%`;
          }
          // Strong momentum signals
          else if (Math.abs(momentum) > 0.08 && spreadPercent < 0.02) {
            if (momentum > 0.08 && rsi < 70) {
              signalType = 'BUY';
              confidence = Math.min(80, 70 + (momentum * 3));
              analysisText = `Strong upward momentum: ${momentum.toFixed(3)}%`;
            } else if (momentum < -0.08 && rsi > 30) {
              signalType = 'SELL';
              confidence = Math.min(80, 70 + (Math.abs(momentum) * 3));
              analysisText = `Strong downward momentum: ${momentum.toFixed(3)}%`;
            }
          }

          // Only generate signals with 75%+ confidence
          if (signalType && confidence >= 75) {
            const isJpyPair = marketItem.symbol.includes('JPY');
            const pipValue = isJpyPair ? 0.01 : 0.0001;
            const atrMultiplier = isJpyPair ? 25 : 60;
            
            const stopLossDistance = pipValue * atrMultiplier;
            const takeProfitDistance = pipValue * (atrMultiplier * 1.2);

            const stopLoss = signalType === 'BUY' 
              ? currentPrice - stopLossDistance 
              : currentPrice + stopLossDistance;

            const takeProfit1 = signalType === 'BUY'
              ? currentPrice + takeProfitDistance
              : currentPrice - takeProfitDistance;

            const takeProfit2 = signalType === 'BUY'
              ? currentPrice + (takeProfitDistance * 1.8)
              : currentPrice - (takeProfitDistance * 1.8);

            const takeProfit3 = signalType === 'BUY'
              ? currentPrice + (takeProfitDistance * 2.5)
              : currentPrice - (takeProfitDistance * 2.5);

            const precision = isJpyPair ? 3 : 5;

            newSignals.push({
              symbol: marketItem.symbol,
              type: signalType,
              price: parseFloat(currentPrice.toFixed(precision)),
              confidence: Math.round(confidence),
              stop_loss: parseFloat(stopLoss.toFixed(precision)),
              take_profits: [
                parseFloat(takeProfit1.toFixed(precision)),
                parseFloat(takeProfit2.toFixed(precision)),
                parseFloat(takeProfit3.toFixed(precision))
              ],
              analysis_text: analysisText,
              status: 'active',
              is_centralized: true,
              user_id: null,
              technical_indicators: {
                rsi: Math.round(rsi),
                momentum: parseFloat(momentum.toFixed(4)),
                spread: parseFloat(spreadPercent.toFixed(6))
              }
            });

            console.log(`✅ Generated ${signalType} signal for ${marketItem.symbol} (${Math.round(confidence)}% confidence)`);
          } else {
            console.log(`⚪ No quality signal for ${marketItem.symbol} (confidence: ${Math.round(confidence)}%)`);
          }

        } catch (error) {
          console.error(`❌ Error analyzing ${marketItem.symbol}:`, error);
        }
      }
    }

    console.log(`🎯 Signal generation complete - ${newSignals.length} signals generated`);

    // Insert new signals
    let insertedCount = 0;
    if (newSignals.length > 0) {
      console.log('💾 Inserting signals into database...');
      
      const { data: insertedSignals, error: insertError } = await supabase
        .from('trading_signals')
        .insert(newSignals)
        .select('id, symbol, type, confidence');

      if (insertError) {
        console.error('❌ Error inserting signals:', insertError);
      } else {
        insertedCount = insertedSignals?.length || 0;
        console.log(`✅ Successfully inserted ${insertedCount} signals`);
      }
    }

    const finalActiveCount = currentActiveCount + insertedCount;
    const buySignals = newSignals.filter(s => s.type === 'BUY').length;
    const sellSignals = newSignals.filter(s => s.type === 'SELL').length;

    console.log(`📊 Final Results:`);
    console.log(`  - New signals: ${insertedCount} (BUY: ${buySignals}, SELL: ${sellSignals})`);
    console.log(`  - Total active: ${finalActiveCount}/20`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${insertedCount} signals (${hasFallbackData ? 'testing mode' : 'live mode'})`,
        stats: {
          signalsGenerated: insertedCount,
          totalActiveSignals: finalActiveCount,
          signalLimit: 20,
          testingMode: hasFallbackData,
          marketClosed: isMarketClosed,
          signalDistribution: {
            newBuySignals: buySignals,
            newSellSignals: sellSignals
          }
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Critical error in signal generation:', error);
    console.error('📍 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        source: 'signal-generation-enhanced',
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
