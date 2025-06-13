
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
    console.log('🤖 Phase 3: Enhanced signal generation with comprehensive debugging...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables');
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Phase 2: Enhanced market hours check
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    console.log(`📅 Phase 2: Market check - Day ${utcDay}, Hour ${utcHour}, Closed: ${isMarketClosed}`);

    if (isMarketClosed) {
      console.log('📴 Phase 2: Market closed - no signal generation will occur');
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

    // Phase 3: Check current active signals with detailed logging
    console.log('📊 Phase 3: Analyzing current signal landscape...');
    const { data: activeSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('id, symbol, type, confidence, created_at')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    if (signalsError) {
      console.error('❌ Phase 3: Error fetching active signals:', signalsError);
    }

    const currentActiveCount = activeSignals?.length || 0;
    console.log(`📈 Phase 3: Current active signals: ${currentActiveCount}/20`);
    
    if (activeSignals && activeSignals.length > 0) {
      console.log('📋 Phase 3: Active signals breakdown:');
      activeSignals.forEach(signal => {
        console.log(`  - ${signal.symbol} ${signal.type} (${signal.confidence}% confidence) - ${signal.created_at}`);
      });
    }

    // Phase 3: Get fresh market data with comprehensive validation
    console.log('💹 Phase 3: Fetching fresh market data for analysis...');
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('symbol, price, bid, ask, created_at, source')
      .order('created_at', { ascending: false })
      .limit(100);

    if (marketError) {
      console.error('❌ Phase 3: Error fetching market data:', marketError);
      throw new Error(`Failed to fetch market data: ${marketError.message}`);
    }

    console.log(`📊 Phase 3: Retrieved ${marketData?.length || 0} market data records`);
    
    if (!marketData || marketData.length === 0) {
      console.log('⚠️ Phase 3: No market data available - cannot generate signals');
      
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

    console.log(`📈 Phase 3: Latest data available for ${latestMarketData.size} currency pairs:`);
    latestMarketData.forEach((data, symbol) => {
      console.log(`  - ${symbol}: ${data.price} (${data.source}) at ${data.created_at}`);
    });

    // Filter valid market data with detailed validation
    const validMarketData = Array.from(latestMarketData.values()).filter(item => {
      if (!item.symbol || !item.price || item.price <= 0) {
        console.warn(`⚠️ Phase 3: Invalid market data for ${item.symbol}: price=${item.price}`);
        return false;
      }
      
      // Check data freshness (within last hour)
      const dataAge = Date.now() - new Date(item.created_at).getTime();
      const oneHour = 60 * 60 * 1000;
      if (dataAge > oneHour) {
        console.warn(`⚠️ Phase 3: Stale data for ${item.symbol}: ${Math.round(dataAge/60000)} minutes old`);
        // Still include but note the age
      }
      
      return true;
    });

    console.log(`✅ Phase 3: ${validMarketData.length}/${marketData.length} valid market data points for signal generation`);

    if (validMarketData.length === 0) {
      console.log('❌ Phase 3: No valid market data for signal generation');
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

    // Phase 3: Prioritize major pairs and limit processing
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
    
    console.log(`🎯 Phase 3: Processing ${pairsToProcess.length} priority pairs: ${pairsToProcess.map(p => p.symbol).join(', ')}`);

    const newSignals = [];
    const processedPairs = [];
    const analysisDetails = [];

    for (const marketItem of pairsToProcess) {
      try {
        // Check if pair already has active signal
        const hasActiveSignal = activeSignals?.some(signal => signal.symbol === marketItem.symbol);
        if (hasActiveSignal) {
          console.log(`⚠️ Phase 3: ${marketItem.symbol} already has active signal - skipping`);
          continue;
        }

        console.log(`🔍 Phase 3: Analyzing ${marketItem.symbol} (Price: ${marketItem.price})`);

        // Enhanced technical analysis with detailed logging
        const currentPrice = parseFloat(marketItem.price.toString());
        const bid = parseFloat(marketItem.bid?.toString() || currentPrice.toString());
        const ask = parseFloat(marketItem.ask?.toString() || currentPrice.toString());
        
        // Calculate spread and basic indicators
        const spread = ask - bid;
        const spreadPercent = (spread / currentPrice) * 100;
        
        console.log(`📊 Phase 3: ${marketItem.symbol} - Price: ${currentPrice}, Spread: ${spreadPercent.toFixed(4)}%`);

        // Get historical data for this symbol
        const { data: recentPrices } = await supabase
          .from('live_market_data')
          .select('price, created_at')
          .eq('symbol', marketItem.symbol)
          .order('created_at', { ascending: false })
          .limit(20);

        let rsi = 50; // Default neutral RSI
        let momentum = 0;
        let pricePoints = [];
        
        if (recentPrices && recentPrices.length >= 5) {
          const prices = recentPrices.map(p => parseFloat(p.price.toString())).filter(p => p > 0);
          pricePoints = prices;
          
          if (prices.length >= 5) {
            // Calculate simple momentum
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
        }

        const analysis = {
          symbol: marketItem.symbol,
          currentPrice,
          rsi: Math.round(rsi),
          momentum: parseFloat(momentum.toFixed(4)),
          spreadPercent: parseFloat(spreadPercent.toFixed(6)),
          historicalPoints: pricePoints.length
        };
        
        analysisDetails.push(analysis);
        
        console.log(`📈 Phase 3: ${marketItem.symbol} Technical Analysis:`);
        console.log(`  - RSI: ${rsi.toFixed(1)}`);
        console.log(`  - Momentum: ${momentum.toFixed(4)}%`);
        console.log(`  - Spread: ${spreadPercent.toFixed(4)}%`);
        console.log(`  - Historical Points: ${pricePoints.length}`);

        // Enhanced signal generation logic
        let signalType = null;
        let confidence = 0;
        let analysisText = '';

        // Buy signal criteria (oversold with positive momentum)
        if (rsi < 35 && momentum > 0.02 && spreadPercent < 0.02) {
          signalType = 'BUY';
          confidence = Math.min(85, 65 + (35 - rsi) * 0.5 + (momentum * 8));
          analysisText = `Strong oversold bounce: RSI ${rsi.toFixed(1)} with positive momentum ${momentum.toFixed(3)}%`;
        }
        // Sell signal criteria (overbought with negative momentum)
        else if (rsi > 65 && momentum < -0.02 && spreadPercent < 0.02) {
          signalType = 'SELL';
          confidence = Math.min(85, 65 + (rsi - 65) * 0.5 + (Math.abs(momentum) * 8));
          analysisText = `Strong overbought reversal: RSI ${rsi.toFixed(1)} with negative momentum ${momentum.toFixed(3)}%`;
        }
        // Strong momentum signals
        else if (Math.abs(momentum) > 0.08 && spreadPercent < 0.02) {
          if (momentum > 0.08 && rsi < 70) {
            signalType = 'BUY';
            confidence = Math.min(80, 70 + (momentum * 3));
            analysisText = `Strong upward momentum: ${momentum.toFixed(3)}% with RSI ${rsi.toFixed(1)}`;
          } else if (momentum < -0.08 && rsi > 30) {
            signalType = 'SELL';
            confidence = Math.min(80, 70 + (Math.abs(momentum) * 3));
            analysisText = `Strong downward momentum: ${momentum.toFixed(3)}% with RSI ${rsi.toFixed(1)}`;
          }
        }

        const processedPair = {
          symbol: marketItem.symbol,
          signalType: signalType || 'NEUTRAL',
          confidence: Math.round(confidence),
          rsi: Math.round(rsi),
          momentum: momentum.toFixed(4),
          reason: analysisText || 'No clear signal detected'
        };
        
        processedPairs.push(processedPair);
        
        console.log(`📊 Phase 3: ${marketItem.symbol} Result: ${signalType || 'NEUTRAL'} (${Math.round(confidence)}% confidence)`);

        // Only generate signals with 75%+ confidence for quality
        if (signalType && confidence >= 75) {
          // Calculate take profits and stop loss
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
            chart_data: pricePoints.slice(0, 10).map((price, index) => ({
              time: Date.now() - (index * 60000),
              price: price
            }))
          };

          newSignals.push(newSignal);
          console.log(`✅ Phase 3: Generated HIGH-QUALITY ${signalType} signal for ${marketItem.symbol} (${Math.round(confidence)}% confidence)`);
        } else {
          console.log(`⚪ Phase 3: No quality signal for ${marketItem.symbol} (confidence: ${Math.round(confidence)}%)`);
        }

      } catch (error) {
        console.error(`❌ Phase 3: Error analyzing ${marketItem.symbol}:`, error);
      }
    }

    console.log(`🎯 Phase 3: Signal generation complete - ${newSignals.length} high-quality signals from ${processedPairs.length} analyzed pairs`);

    // Phase 4: Insert new signals with validation
    let insertedCount = 0;
    if (newSignals.length > 0) {
      console.log('💾 Phase 4: Inserting high-quality signals into database...');
      
      const { data: insertedSignals, error: insertError } = await supabase
        .from('trading_signals')
        .insert(newSignals)
        .select('id, symbol, type, confidence');

      if (insertError) {
        console.error('❌ Phase 4: Error inserting signals:', insertError);
      } else {
        insertedCount = insertedSignals?.length || 0;
        console.log(`✅ Phase 4: Successfully inserted ${insertedCount} high-quality signals`);
        
        if (insertedSignals) {
          insertedSignals.forEach(signal => {
            console.log(`  - ${signal.symbol} ${signal.type} (${signal.confidence}% confidence) - ID: ${signal.id}`);
          });
        }
      }
    } else {
      console.log('📊 Phase 4: No signals met the high-quality threshold (75%+ confidence)');
    }

    const finalActiveCount = currentActiveCount + insertedCount;
    const buySignals = newSignals.filter(s => s.type === 'BUY').length;
    const sellSignals = newSignals.filter(s => s.type === 'SELL').length;

    console.log(`📊 Phase 4: Final Results:`);
    console.log(`  - New signals: ${insertedCount} (BUY: ${buySignals}, SELL: ${sellSignals})`);
    console.log(`  - Total active: ${finalActiveCount}/20`);
    console.log(`  - Pairs analyzed: ${processedPairs.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${insertedCount} high-quality signals from ${processedPairs.length} analyzed pairs`,
        stats: {
          signalsGenerated: insertedCount,
          totalActiveSignals: finalActiveCount,
          signalLimit: 20,
          pairsAnalyzed: processedPairs.length,
          signalDistribution: {
            newBuySignals: buySignals,
            newSellSignals: sellSignals
          },
          qualityThreshold: '75%+ confidence',
          processedPairs: processedPairs,
          analysisDetails: analysisDetails
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Critical error in enhanced signal generation:', error);
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
