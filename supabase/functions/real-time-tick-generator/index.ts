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
      volatility: 0.4, 
      trend: 0.15,
      spreadMultiplier: 1.2
    };
  } else if (utcHour >= 8 && utcHour < 16) {
    return { 
      name: 'European', 
      volatility: 0.8, 
      trend: 0.3, 
      spreadMultiplier: 1.0 
    };
  } else if (utcHour >= 13 && utcHour < 17) {
    return { 
      name: 'US-EU-Overlap', 
      volatility: 1.2, 
      trend: 0.4, 
      spreadMultiplier: 0.8
    };
  } else {
    return { 
      name: 'US', 
      volatility: 1.0, 
      trend: 0.35, 
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

// Enhanced market event simulation
const getMarketEventMultiplier = () => {
  if (Math.random() < 0.02) { // 2% chance of market event
    return 2.5 + Math.random() * 2.0; // 2.5x to 4.5x volatility spike
  }
  return 1;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Enhanced real-time tick generator (1.5s FastForex interpolation)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if market is open
    if (!isMarketOpen()) {
      console.log('💤 Market closed - NO TICKING during market closure');
      
      // During market closure, do absolutely nothing - no price updates at all
      return new Response(
        JSON.stringify({ 
          message: 'Market closed - no price movements generated',
          isMarketOpen: false,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Market is open - generate enhanced realistic ticks from FastForex baseline
    const session = getMarketSession();
    const eventMultiplier = getMarketEventMultiplier();
    console.log(`📊 ${session.name} session (volatility: ${session.volatility.toFixed(1)}, event: ${eventMultiplier.toFixed(1)}x)`);

    // Get current FastForex-based prices from centralized market state
    const { data: marketStates, error: stateError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false });

    if (stateError || !marketStates || marketStates.length === 0) {
      console.log('⚠️ No FastForex baseline data found, requesting refresh...');
      
      // Trigger the FastForex baseline refresh
      const { error: streamError } = await supabase.functions.invoke('centralized-market-stream');
      if (streamError) {
        console.error('❌ Error triggering FastForex refresh:', streamError);
      }
      
      return new Response(
        JSON.stringify({ 
          message: 'No FastForex baseline, triggered refresh',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Generating enhanced ticks from FastForex baseline for ${marketStates.length} pairs`);

    const tickUpdates = [];
    const priceHistoryBatch = [];
    const timestamp = new Date().toISOString();

    for (const marketState of marketStates) {
      try {
        const basePrice = parseFloat(marketState.current_price.toString());
        const isJpyPair = marketState.symbol.includes('JPY');
        
        // Enhanced volatility calculation anchored to FastForex data
        const baseVolatility = basePrice * 0.0003; // Increased base volatility for 1.5s ticks
        const sessionVolatility = baseVolatility * session.volatility * eventMultiplier;
        
        // Advanced trend analysis from recent price history
        let trendBias = 0;
        let momentumFactor = 1;
        
        const { data: recentHistory } = await supabase
          .from('live_price_history')
          .select('price, timestamp')
          .eq('symbol', marketState.symbol)
          .order('timestamp', { ascending: false })
          .limit(20); // Look at more history for better trend analysis
          
        if (recentHistory && recentHistory.length >= 5) {
          const prices = recentHistory.map(h => parseFloat(h.price.toString())).reverse();
          
          // Calculate short-term trend (last 3 vs last 6)
          const recentAvg = prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
          const olderAvg = prices.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
          const shortTrend = recentAvg - olderAvg;
          
          // Calculate momentum
          if (prices.length >= 10) {
            const mediumAvg = prices.slice(-10, -6).reduce((a, b) => a + b, 0) / 4;
            const longTrend = recentAvg - mediumAvg;
            momentumFactor = Math.abs(longTrend) > Math.abs(shortTrend) ? 1.6 : 0.8;
          }
          
          // Apply trend bias with session influence
          if (Math.random() < session.trend) {
            trendBias = (shortTrend > 0 ? 1 : -1) * sessionVolatility * 0.4 * momentumFactor;
          }
          
          // Mean reversion for extreme moves
          const totalMove = prices[prices.length - 1] - prices[0];
          const movePercent = Math.abs(totalMove / basePrice);
          if (movePercent > 0.001) {
            trendBias *= 0.3; // Strong mean reversion after big moves
          }
        }
        
        // Generate realistic tick movement with enhanced microstructure noise
        const randomWalk = (Math.random() - 0.5) * 2 * sessionVolatility;
        const microNoise = (Math.random() - 0.5) * sessionVolatility * 0.2;
        const tickMovement = randomWalk + trendBias + microNoise;
        
        const newPrice = basePrice + tickMovement;
        
        // Calculate dynamic bid/ask spread
        const pipValue = isJpyPair ? 0.01 : 0.0001;
        const baseSpreadPips = isJpyPair ? 1.5 : 1.0;
        const volatilitySpread = session.volatility * eventMultiplier * 0.5;
        const spreadPips = (baseSpreadPips + volatilitySpread) * session.spreadMultiplier;
        const spread = spreadPips * pipValue;
        
        // Enhanced order flow simulation for spread asymmetry
        const orderFlowBias = (Math.random() - 0.5) * 0.3;
        const bidSpread = spread * (0.5 + orderFlowBias);
        const askSpread = spread * (0.5 - orderFlowBias);
        
        const bid = parseFloat((newPrice - bidSpread).toFixed(isJpyPair ? 3 : 5));
        const ask = parseFloat((newPrice + askSpread).toFixed(isJpyPair ? 3 : 5));
        const midPrice = parseFloat(((bid + ask) / 2).toFixed(isJpyPair ? 3 : 5));

        // Prepare enhanced tick update
        const tickUpdate = {
          symbol: marketState.symbol,
          current_price: midPrice,
          bid,
          ask,
          last_update: timestamp,
          is_market_open: true,
          source: `${session.name.toLowerCase()}-tick-enhanced`
        };

        tickUpdates.push(tickUpdate);

        // Add to price history batch
        priceHistoryBatch.push({
          symbol: marketState.symbol,
          price: midPrice,
          bid,
          ask,
          timestamp,
          source: `${session.name.toLowerCase()}-tick-enhanced`
        });

        console.log(`📈 ${marketState.symbol}: ${basePrice.toFixed(isJpyPair ? 3 : 5)} → ${midPrice} (${session.name} enhanced tick, ${eventMultiplier > 1 ? 'EVENT' : 'normal'})`);

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
        console.log(`📊 Batch inserted ${priceHistoryBatch.length} enhanced tick records`);
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

    // Enhanced cleanup old price history (keep last 100 points per pair)
    const cleanupPromises = marketStates.slice(0, 8).map(async (marketState) => {
      const { data: oldRecords } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', marketState.symbol)
        .order('timestamp', { ascending: false })
        .range(100, 200);
        
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        await supabase
          .from('live_price_history')
          .delete()
          .in('id', idsToDelete);
      }
    });

    await Promise.allSettled(cleanupPromises);

    console.log(`✅ Generated ${tickUpdates.length} enhanced FastForex-based ticks (${session.name} session, ${eventMultiplier > 1 ? 'event spike' : 'normal'})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${tickUpdates.length} enhanced FastForex-based ticks`,
        session: session.name,
        volatility: session.volatility,
        eventMultiplier: eventMultiplier > 1 ? eventMultiplier : null,
        pairs: tickUpdates.map(u => u.symbol),
        timestamp,
        isMarketOpen: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Enhanced FastForex tick generator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
