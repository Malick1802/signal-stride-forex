
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Enhanced signal generation with Tiingo data validation...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
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

    console.log(`📅 Market check: Day ${utcDay}, Hour ${utcHour}, Closed: ${isMarketClosed}`);

    if (isMarketClosed) {
      console.log('📴 Market closed - skipping signal generation');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Market closed - no signal generation',
          stats: {
            signalsGenerated: 0,
            totalActiveSignals: 0,
            marketClosed: true
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check current active signals
    const { data: activeSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('id, symbol, type, confidence')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    if (signalsError) {
      console.error('❌ Error fetching active signals:', signalsError);
    }

    const currentActiveCount = activeSignals?.length || 0;
    console.log(`📊 Current active signals: ${currentActiveCount}/20`);

    // Get fresh market data with validation
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .eq('is_market_open', true)
      .order('last_update', { ascending: false });

    if (marketError) {
      console.error('❌ Error fetching market data:', marketError);
      throw new Error(`Failed to fetch market data: ${marketError.message}`);
    }

    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No market data available - triggering market update');
      
      const { error: triggerError } = await supabase.functions.invoke('centralized-market-stream');
      if (triggerError) {
        console.error('❌ Failed to trigger market update:', triggerError);
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No market data available - triggered refresh',
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

    console.log(`📈 Processing ${marketData.length} market data points`);

    // Filter valid market data
    const validMarketData = marketData.filter(item => {
      if (!item.symbol || !item.current_price || item.current_price <= 0) {
        console.warn(`⚠️ Invalid market data for ${item.symbol}: price=${item.current_price}`);
        return false;
      }
      return true;
    });

    console.log(`✅ ${validMarketData.length}/${marketData.length} valid market data points`);

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

    // Prioritize major pairs
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    const sortedPairs = validMarketData.sort((a, b) => {
      const aIsMajor = majorPairs.includes(a.symbol);
      const bIsMajor = majorPairs.includes(b.symbol);
      if (aIsMajor && !bIsMajor) return -1;
      if (!aIsMajor && bIsMajor) return 1;
      return 0;
    });

    // Limit processing to prevent timeout
    const maxPairsToProcess = Math.min(8, sortedPairs.length);
    const pairsToProcess = sortedPairs.slice(0, maxPairsToProcess);
    
    console.log(`🎯 Processing ${pairsToProcess.length} pairs: ${pairsToProcess.map(p => p.symbol).join(', ')}`);

    const newSignals = [];
    const processedPairs = [];

    for (const marketItem of pairsToProcess) {
      try {
        // Check if pair already has active signal
        const hasActiveSignal = activeSignals?.some(signal => signal.symbol === marketItem.symbol);
        if (hasActiveSignal) {
          console.log(`⚠️ ${marketItem.symbol} already has active signal - skipping`);
          continue;
        }

        console.log(`🔍 Analyzing ${marketItem.symbol} (Price: ${marketItem.current_price})`);

        // Enhanced technical analysis
        const currentPrice = parseFloat(marketItem.current_price.toString());
        const bid = parseFloat(marketItem.bid?.toString() || currentPrice.toString());
        const ask = parseFloat(marketItem.ask?.toString() || currentPrice.toString());
        
        // Calculate spread and volatility indicators
        const spread = ask - bid;
        const spreadPercent = (spread / currentPrice) * 100;
        
        // Simple momentum analysis
        const { data: recentPrices } = await supabase
          .from('live_price_history')
          .select('price, timestamp')
          .eq('symbol', marketItem.symbol)
          .order('timestamp', { ascending: false })
          .limit(20);

        let rsi = 50; // Default neutral RSI
        let momentum = 0;
        
        if (recentPrices && recentPrices.length >= 10) {
          // Calculate simple momentum
          const prices = recentPrices.map(p => parseFloat(p.price.toString()));
          const oldPrice = prices[prices.length - 1];
          momentum = ((currentPrice - oldPrice) / oldPrice) * 100;
          
          // Simple RSI approximation
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

        console.log(`📊 ${marketItem.symbol} Analysis: RSI=${rsi.toFixed(1)}, Momentum=${momentum.toFixed(3)}%, Spread=${spreadPercent.toFixed(4)}%`);

        // Enhanced signal criteria
        let signalType = null;
        let confidence = 0;
        let analysisText = '';

        // Buy signal criteria
        if (rsi < 35 && momentum > 0.01 && spreadPercent < 0.01) {
          signalType = 'BUY';
          confidence = Math.min(85, 60 + (35 - rsi) + (momentum * 10));
          analysisText = `Oversold bounce signal: RSI ${rsi.toFixed(1)} with positive momentum ${momentum.toFixed(3)}%`;
        }
        // Sell signal criteria
        else if (rsi > 65 && momentum < -0.01 && spreadPercent < 0.01) {
          signalType = 'SELL';
          confidence = Math.min(85, 60 + (rsi - 65) + (Math.abs(momentum) * 10));
          analysisText = `Overbought reversal signal: RSI ${rsi.toFixed(1)} with negative momentum ${momentum.toFixed(3)}%`;
        }

        // Strong momentum signals
        if (!signalType && Math.abs(momentum) > 0.05) {
          if (momentum > 0.05 && rsi < 70) {
            signalType = 'BUY';
            confidence = Math.min(80, 65 + (momentum * 5));
            analysisText = `Strong upward momentum: ${momentum.toFixed(3)}% with RSI ${rsi.toFixed(1)}`;
          } else if (momentum < -0.05 && rsi > 30) {
            signalType = 'SELL';
            confidence = Math.min(80, 65 + (Math.abs(momentum) * 5));
            analysisText = `Strong downward momentum: ${momentum.toFixed(3)}% with RSI ${rsi.toFixed(1)}`;
          }
        }

        processedPairs.push({
          symbol: marketItem.symbol,
          signalType: signalType || 'NEUTRAL',
          confidence: Math.round(confidence),
          rsi: Math.round(rsi),
          momentum: momentum.toFixed(3)
        });

        // Only generate signals with 70%+ confidence
        if (signalType && confidence >= 70) {
          // Calculate take profits and stop loss
          const isJpyPair = marketItem.symbol.includes('JPY');
          const pipValue = isJpyPair ? 0.01 : 0.0001;
          const atrMultiplier = isJpyPair ? 20 : 50;
          
          const stopLossDistance = pipValue * atrMultiplier;
          const takeProfitDistance = pipValue * (atrMultiplier * 1.5);

          const stopLoss = signalType === 'BUY' 
            ? currentPrice - stopLossDistance 
            : currentPrice + stopLossDistance;

          const takeProfit1 = signalType === 'BUY'
            ? currentPrice + takeProfitDistance
            : currentPrice - takeProfitDistance;

          const takeProfit2 = signalType === 'BUY'
            ? currentPrice + (takeProfitDistance * 2)
            : currentPrice - (takeProfitDistance * 2);

          const takeProfit3 = signalType === 'BUY'
            ? currentPrice + (takeProfitDistance * 3)
            : currentPrice - (takeProfitDistance * 3);

          const precision = isJpyPair ? 3 : 5;

          const newSignal = {
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
            },
            chart_data: recentPrices ? recentPrices.slice(0, 10).map(p => ({
              time: new Date(p.timestamp).getTime(),
              price: parseFloat(p.price.toString())
            })) : []
          };

          newSignals.push(newSignal);
          console.log(`✅ Generated ${signalType} signal for ${marketItem.symbol} (${Math.round(confidence)}% confidence)`);
        } else {
          console.log(`⚪ No quality signal for ${marketItem.symbol} (confidence: ${Math.round(confidence)}%)`);
        }

      } catch (error) {
        console.error(`❌ Error analyzing ${marketItem.symbol}:`, error);
      }
    }

    console.log(`🎯 Signal generation results: ${newSignals.length} new signals from ${processedPairs.length} analyzed pairs`);

    // Insert new signals
    let insertedCount = 0;
    if (newSignals.length > 0) {
      const { data: insertedSignals, error: insertError } = await supabase
        .from('trading_signals')
        .insert(newSignals)
        .select('id, symbol, type, confidence');

      if (insertError) {
        console.error('❌ Error inserting signals:', insertError);
      } else {
        insertedCount = insertedSignals?.length || 0;
        console.log(`✅ Successfully inserted ${insertedCount} new signals`);
      }
    }

    const finalActiveCount = currentActiveCount + insertedCount;
    const buySignals = newSignals.filter(s => s.type === 'BUY').length;
    const sellSignals = newSignals.filter(s => s.type === 'SELL').length;

    console.log(`📊 Signal generation complete: ${insertedCount} new signals (BUY: ${buySignals}, SELL: ${sellSignals}), ${finalActiveCount}/20 total active`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${insertedCount} new signals from ${processedPairs.length} analyzed pairs`,
        stats: {
          signalsGenerated: insertedCount,
          totalActiveSignals: finalActiveCount,
          signalLimit: 20,
          pairsAnalyzed: processedPairs.length,
          signalDistribution: {
            newBuySignals: buySignals,
            newSellSignals: sellSignals
          },
          processedPairs: processedPairs
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
        source: 'signal-generation-error',
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
