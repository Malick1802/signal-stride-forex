import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced market session characteristics
const getMarketSession = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 22 || utcHour < 8) {
    return { 
      name: 'Asian', 
      volatility: 0.3, 
      trend: 0.1,
      spreadMultiplier: 1.3
    };
  } else if (utcHour >= 8 && utcHour < 16) {
    return { 
      name: 'European', 
      volatility: 0.6, 
      trend: 0.25, 
      spreadMultiplier: 1.0 
    };
  } else if (utcHour >= 13 && utcHour < 17) {
    return { 
      name: 'US-EU-Overlap', 
      volatility: 0.9, 
      trend: 0.35, 
      spreadMultiplier: 0.8
    };
  } else {
    return { 
      name: 'US', 
      volatility: 0.7, 
      trend: 0.3, 
      spreadMultiplier: 0.9 
    };
  }
};

const isMarketOpen = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  
  const isFridayEvening = utcDay === 5 && utcHour >= 22;
  const isSaturday = utcDay === 6;
  const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
  
  return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Enhanced Tiingo-based real-time tick generator (1.5s realistic ticks)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const tiingoApiKey = Deno.env.get('TIINGO_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if market is open
    if (!isMarketOpen()) {
      console.log('💤 Market closed - NO TICKING during market closure');
      
      return new Response(
        JSON.stringify({ 
          message: 'Market closed - no price movements generated',
          isMarketOpen: false,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Market is open - generate enhanced realistic ticks from Tiingo baseline
    const session = getMarketSession();
    console.log(`📊 ${session.name} session (volatility: ${session.volatility.toFixed(1)})`);

    // Get current Tiingo-based prices from centralized market state
    const { data: marketStates, error: stateError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false });

    if (stateError || !marketStates || marketStates.length === 0) {
      console.log('⚠️ No Tiingo baseline data found, requesting refresh...');
      
      // Trigger the Tiingo baseline refresh
      const { error: streamError } = await supabase.functions.invoke('centralized-market-stream');
      if (streamError) {
        console.error('❌ Error triggering Tiingo refresh:', streamError);
      }
      
      return new Response(
        JSON.stringify({ 
          message: 'No Tiingo baseline, triggered refresh',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Generating enhanced ticks from Tiingo baseline for ${marketStates.length} pairs`);

    const tickUpdates = [];
    const priceHistoryBatch = [];
    const timestamp = new Date().toISOString();

    // Use real Tiingo data with some minor pairs to get fresh quotes for major pairs
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    
    // For major pairs, try to get fresh Tiingo data for more realistic ticks
    if (tiingoApiKey) {
      for (const pair of majorPairs.slice(0, 3)) { // Limit to 3 to avoid rate limits
        try {
          const tiingoPair = pair.toLowerCase();
          const tiingoUrl = `https://api.tiingo.com/tiingo/fx/${tiingoPair}/top?token=${tiingoApiKey}`;
          
          const response = await fetch(tiingoUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Token ${tiingoApiKey}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              const tickerData = data[0];
              const currentPrice = tickerData.midPrice || tickerData.close || tickerData.last;
              
              if (currentPrice && typeof currentPrice === 'number' && currentPrice > 0) {
                // Update the market state with fresh Tiingo data
                const marketState = marketStates.find(ms => ms.symbol === pair);
                if (marketState) {
                  marketState.current_price = currentPrice;
                  marketState.bid = tickerData.bidPrice || (currentPrice * 0.9999);
                  marketState.ask = tickerData.askPrice || (currentPrice * 1.0001);
                  console.log(`🔥 Fresh Tiingo data for ${pair}: ${currentPrice.toFixed(5)}`);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not get fresh Tiingo data for ${pair}:`, error.message);
        }
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    for (const marketState of marketStates) {
      try {
        const basePrice = parseFloat(marketState.current_price.toString());
        const isJpyPair = marketState.symbol.includes('JPY');
        
        // Enhanced volatility calculation anchored to Tiingo data
        const baseVolatility = basePrice * 0.0002; // Realistic forex volatility for 1.5s ticks
        const sessionVolatility = baseVolatility * session.volatility;
        
        // Advanced trend analysis from recent price history
        let trendBias = 0;
        
        const { data: recentHistory } = await supabase
          .from('live_price_history')
          .select('price, timestamp')
          .eq('symbol', marketState.symbol)
          .order('timestamp', { ascending: false })
          .limit(15);
          
        if (recentHistory && recentHistory.length >= 5) {
          const prices = recentHistory.map(h => parseFloat(h.price.toString())).reverse();
          
          // Calculate short-term trend
          const recentAvg = prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
          const olderAvg = prices.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
          const shortTrend = recentAvg - olderAvg;
          
          // Apply trend bias with session influence
          if (Math.random() < session.trend) {
            trendBias = (shortTrend > 0 ? 1 : -1) * sessionVolatility * 0.3;
          }
          
          // Mean reversion for extreme moves
          const totalMove = prices[prices.length - 1] - prices[0];
          const movePercent = Math.abs(totalMove / basePrice);
          if (movePercent > 0.0008) {
            trendBias *= 0.4; // Strong mean reversion after big moves
          }
        }
        
        // Generate realistic tick movement with microstructure noise
        const randomWalk = (Math.random() - 0.5) * 2 * sessionVolatility;
        const microNoise = (Math.random() - 0.5) * sessionVolatility * 0.15;
        const tickMovement = randomWalk + trendBias + microNoise;
        
        const newPrice = basePrice + tickMovement;
        
        // Calculate realistic bid/ask spread
        const pipValue = isJpyPair ? 0.01 : 0.0001;
        const baseSpreadPips = isJpyPair ? 1.2 : 0.8;
        const volatilitySpread = session.volatility * 0.3;
        const spreadPips = (baseSpreadPips + volatilitySpread) * session.spreadMultiplier;
        const spread = spreadPips * pipValue;
        
        const bid = parseFloat((newPrice - spread/2).toFixed(isJpyPair ? 3 : 5));
        const ask = parseFloat((newPrice + spread/2).toFixed(isJpyPair ? 3 : 5));
        const midPrice = parseFloat(((bid + ask) / 2).toFixed(isJpyPair ? 3 : 5));

        // Prepare enhanced tick update
        const tickUpdate = {
          symbol: marketState.symbol,
          current_price: midPrice,
          bid,
          ask,
          last_update: timestamp,
          is_market_open: true,
          source: `${session.name.toLowerCase()}-tiingo-tick`
        };

        tickUpdates.push(tickUpdate);

        // Add to price history batch
        priceHistoryBatch.push({
          symbol: marketState.symbol,
          price: midPrice,
          bid,
          ask,
          timestamp,
          source: `${session.name.toLowerCase()}-tiingo-tick`
        });

        console.log(`📈 ${marketState.symbol}: ${basePrice.toFixed(isJpyPair ? 3 : 5)} → ${midPrice} (${session.name} Tiingo-based tick)`);

      } catch (error) {
        console.error(`❌ Error generating enhanced tick for ${marketState.symbol}:`, error);
      }
    }

    // Batch insert price history for performance
    if (priceHistoryBatch.length > 0) {
      const { error: historyError } = await supabase
        .from('live_price_history')
        .insert(priceHistoryBatch);

      if (historyError) {
        console.error('❌ Error batch inserting enhanced tick history:', historyError);
      } else {
        console.log(`📊 Batch inserted ${priceHistoryBatch.length} Tiingo-based tick records`);
      }
    }

    // Batch update market state
    for (const update of tickUpdates) {
      const { error } = await supabase
        .from('centralized_market_state')
        .upsert(update, { onConflict: 'symbol' });
        
      if (error) {
        console.error(`❌ Error updating enhanced tick state for ${update.symbol}:`, error);
      }
    }

    // Enhanced cleanup old price history (keep last 80 points per pair)
    const cleanupPromises = marketStates.slice(0, 6).map(async (marketState) => {
      const { data: oldRecords } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', marketState.symbol)
        .order('timestamp', { ascending: false })
        .range(80, 150);
        
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        await supabase
          .from('live_price_history')
          .delete()
          .in('id', idsToDelete);
      }
    });

    await Promise.allSettled(cleanupPromises);

    console.log(`✅ Generated ${tickUpdates.length} enhanced Tiingo-based ticks (${session.name} session)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${tickUpdates.length} enhanced Tiingo-based ticks`,
        session: session.name,
        volatility: session.volatility,
        pairs: tickUpdates.map(u => u.symbol),
        timestamp,
        isMarketOpen: true,
        source: 'tiingo-enhanced'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Enhanced Tiingo tick generator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
