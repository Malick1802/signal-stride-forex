
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
    console.log('🚀 Tiingo centralized market stream (60s refresh cycle)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const tiingoApiKey = Deno.env.get('TIINGO_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !tiingoApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // EXPANDED currency pairs for centralized streaming - Now supports all 30 pairs
    const streamingPairs = [
      // Major pairs
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      // Major crosses
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
      // Additional cross pairs
      'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
      'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY', 'EURCAD', 'GBPAUD',
      // Extended pairs
      'USDNOK', 'USDSEK', 'AUDSGD'
    ];

    console.log(`💱 Fetching Tiingo forex data for ${streamingPairs.length} pairs (60s cycle)`);

    // Check market hours
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    if (isMarketClosed) {
      console.log('📴 Market closed - generating minimal weekend movement');
      
      // During market close, make small random adjustments to existing prices
      const { data: existingStates, error: existingError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .limit(streamingPairs.length);
        
      if (!existingError && existingStates?.length > 0) {
        const weekendUpdates = [];
        const timestamp = new Date().toISOString();
        
        for (const state of existingStates) {
          const basePrice = parseFloat(state.current_price.toString());
          const weekendMovement = (Math.random() - 0.5) * basePrice * 0.00003; // Very small 0.003% movement
          const newPrice = parseFloat((basePrice + weekendMovement).toFixed(state.symbol.includes('JPY') ? 3 : 5));
          
          const spread = newPrice * (state.symbol.includes('JPY') ? 0.00005 : 0.00003);
          const bid = parseFloat((newPrice - spread/2).toFixed(state.symbol.includes('JPY') ? 3 : 5));
          const ask = parseFloat((newPrice + spread/2).toFixed(state.symbol.includes('JPY') ? 3 : 5));
          
          weekendUpdates.push({
            symbol: state.symbol,
            current_price: newPrice,
            bid,
            ask,
            last_update: timestamp,
            is_market_open: false,
            source: 'weekend-simulation'
          });
        }
        
        // Update market state
        for (const update of weekendUpdates) {
          await supabase
            .from('centralized_market_state')
            .upsert(update, { onConflict: 'symbol' });
        }
        
        console.log(`✅ Weekend simulation updated ${weekendUpdates.length} pairs`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Weekend market simulation completed',
          isMarketOpen: false,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Market is open - fetch fresh Tiingo data using bulk endpoint
    const tickerList = streamingPairs.map(pair => pair.toLowerCase()).join(',');
    const tiingoUrl = `https://api.tiingo.com/tiingo/fx/top?tickers=${tickerList}&token=${tiingoApiKey}`;
    
    console.log(`🔄 Fetching fresh Tiingo data: ${tickerList.substring(0, 50)}...`);
    
    const response = await fetch(tiingoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CentralizedMarketStream/2.0',
        'Authorization': `Token ${tiingoApiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Tiingo API error: ${response.status} - ${response.statusText}`);
    }
    
    const tiingoData = await response.json();
    
    if (!Array.isArray(tiingoData) || tiingoData.length === 0) {
      throw new Error('Invalid Tiingo response format or no data returned');
    }
    
    console.log(`💱 Fresh Tiingo data received for ${tiingoData.length} pairs`);

    // Process Tiingo data and update centralized state
    const marketUpdates = [];
    const priceHistory = [];
    const timestamp = new Date().toISOString();

    for (const tickerData of tiingoData) {
      try {
        const symbol = tickerData.ticker ? tickerData.ticker.toUpperCase() : null;
        if (!symbol || !streamingPairs.includes(symbol)) {
          continue;
        }

        // Use Tiingo's actual bid/ask data
        const midPrice = tickerData.midPrice;
        const bidPrice = tickerData.bidPrice;
        const askPrice = tickerData.askPrice;
        const quoteTimestamp = tickerData.quoteTimestamp;

        if (!midPrice || typeof midPrice !== 'number' || midPrice <= 0) {
          console.warn(`⚠️ Invalid price data for ${symbol}:`, tickerData);
          continue;
        }

        // Use actual bid/ask if available, otherwise calculate realistic spreads
        const actualBid = bidPrice && typeof bidPrice === 'number' ? bidPrice : 
          midPrice - (midPrice * (symbol.includes('JPY') ? 0.00002 : 0.00001));
        const actualAsk = askPrice && typeof askPrice === 'number' ? askPrice : 
          midPrice + (midPrice * (symbol.includes('JPY') ? 0.00002 : 0.00001));

        const precision = symbol.includes('JPY') ? 3 : 5;
        const finalPrice = parseFloat(midPrice.toFixed(precision));
        const finalBid = parseFloat(actualBid.toFixed(precision));
        const finalAsk = parseFloat(actualAsk.toFixed(precision));

        // Get current market session for data source labeling
        const session = getMarketSession();

        // Prepare fresh market state update with Tiingo data
        marketUpdates.push({
          symbol,
          current_price: finalPrice,
          bid: finalBid,
          ask: finalAsk,
          last_update: timestamp,
          is_market_open: true,
          source: `tiingo-${session.name.toLowerCase()}`
        });

        // Prepare fresh price history entry
        priceHistory.push({
          symbol,
          price: finalPrice,
          bid: finalBid,
          ask: finalAsk,
          timestamp: quoteTimestamp || timestamp,
          source: `tiingo-${session.name.toLowerCase()}`
        });
        
        console.log(`📈 ${symbol}: ${finalPrice} (bid: ${finalBid}, ask: ${finalAsk}) - Tiingo ${session.name}`);
      } catch (error) {
        console.error(`❌ Error processing ${tickerData.ticker || 'unknown'}:`, error);
      }
    }

    console.log(`💾 Updating fresh market state for ${marketUpdates.length} pairs with Tiingo data`);

    // Update centralized market state with fresh Tiingo data
    for (const update of marketUpdates) {
      const { error } = await supabase
        .from('centralized_market_state')
        .upsert(update, { onConflict: 'symbol' });
        
      if (error) {
        console.error(`❌ Error updating fresh market state for ${update.symbol}:`, error);
      }
    }

    // Insert fresh price history
    const { error: historyError } = await supabase
      .from('live_price_history')
      .insert(priceHistory);
      
    if (historyError) {
      console.error('❌ Error inserting fresh price history:', historyError);
    }

    // Efficient cleanup: keep only last 200 points per pair
    for (const pair of streamingPairs) {
      const { data: oldRecords } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', pair)
        .order('timestamp', { ascending: false })
        .range(200, 1000);
        
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        await supabase
          .from('live_price_history')
          .delete()
          .in('id', idsToDelete);
      }
    }

    console.log('✅ Fresh Tiingo market stream update completed (60s cycle)');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fresh Tiingo data updated for ${marketUpdates.length} pairs`,
        pairs: marketUpdates.map(u => u.symbol),
        timestamp,
        source: 'tiingo-fresh-60s',
        isMarketOpen: true,
        session: getMarketSession().name,
        dataQuality: 'institutional-grade'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Tiingo market stream error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        source: 'tiingo-error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get current market session
function getMarketSession() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 22 || utcHour < 8) {
    return { name: 'Asian', spreadMultiplier: 1.2 };
  } else if (utcHour >= 8 && utcHour < 16) {
    return { name: 'European', spreadMultiplier: 1.0 };
  } else if (utcHour >= 13 && utcHour < 17) {
    return { name: 'US-EU-Overlap', spreadMultiplier: 0.8 };
  } else {
    return { name: 'US', spreadMultiplier: 0.9 };
  }
}
