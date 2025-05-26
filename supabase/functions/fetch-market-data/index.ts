
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY')!;
    
    if (!fastForexApiKey) {
      throw new Error('FastForex API key not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting market data fetch from FastForex...');

    // Check if forex markets are open
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                        (utcDay === 0 && utcHour >= 22) || 
                        (utcDay === 5 && utcHour < 22);

    console.log(`Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'} (Day: ${utcDay}, Hour: ${utcHour})`);

    // Major forex pairs - use the format FastForex expects
    const symbols = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
      'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF',
      'AUDCHF', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD',
      'GBPAUD', 'GBPNZD', 'GBPCAD', 'AUDNZD', 'AUDCAD', 'NZDCAD'
    ];

    console.log(`Fetching real market data for ${symbols.length} currency pairs from FastForex`);

    // Use the correct FastForex API endpoint format
    const fastForexUrl = `https://api.fastforex.io/fetch-all?api_key=${fastForexApiKey}`;
    
    console.log('Calling FastForex API...');
    const response = await fetch(fastForexUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ForexSignalApp/1.0'
      }
    });
    
    console.log(`FastForex API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FastForex API error: ${response.status} - ${errorText}`);
      throw new Error(`FastForex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('FastForex API response received:', Object.keys(data));

    if (!data.results || Object.keys(data.results).length === 0) {
      console.error('No forex data received from FastForex API');
      throw new Error('No forex data received from FastForex API');
    }

    // Filter only the pairs we want and transform FastForex data to our format
    const marketDataBatch = symbols.map(symbol => {
      const rate = data.results[symbol];
      if (!rate) {
        console.warn(`No data found for ${symbol}`);
        return null;
      }
      
      const price = parseFloat(rate);
      
      if (isNaN(price) || price <= 0) {
        console.warn(`Invalid price for ${symbol}: ${rate}`);
        return null;
      }
      
      // Calculate realistic bid/ask spread
      const spread = price * (symbol.includes('JPY') ? 0.002 : 0.00002);
      const bid = parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));
      const ask = parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));

      return {
        symbol,
        price: parseFloat(price.toFixed(symbol.includes('JPY') ? 3 : 5)),
        bid,
        ask,
        source: 'fastforex',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
    }).filter(Boolean); // Remove null entries

    console.log(`Processed ${marketDataBatch.length} forex pairs from FastForex`);

    if (marketDataBatch.length === 0) {
      throw new Error('No valid market data processed');
    }

    // Clear old data (keep only last 50 records per symbol)
    for (const item of marketDataBatch) {
      const { data: oldRecords } = await supabase
        .from('live_market_data')
        .select('id')
        .eq('symbol', item.symbol)
        .order('created_at', { ascending: false })
        .range(50, 1000);
      
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        await supabase
          .from('live_market_data')
          .delete()
          .in('id', idsToDelete);
      }
    }

    // Insert new real market data
    const { error: insertError } = await supabase
      .from('live_market_data')
      .insert(marketDataBatch);

    if (insertError) {
      console.error('Error inserting market data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert market data', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully inserted ${marketDataBatch.length} real market data records from FastForex`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${marketDataBatch.length} currency pairs with real FastForex data`,
        pairs: marketDataBatch.map(item => item.symbol),
        marketOpen: isMarketOpen,
        timestamp: new Date().toISOString(),
        source: 'fastforex',
        base_currency: data.base || 'USD'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-market-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
