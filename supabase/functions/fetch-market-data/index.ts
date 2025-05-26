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

    // Major forex pairs supported by FastForex
    const symbols = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD',
      'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'GBP/CHF',
      'AUD/CHF', 'CAD/JPY', 'CHF/JPY', 'EUR/AUD', 'EUR/NZD', 'EUR/CAD',
      'GBP/AUD', 'GBP/NZD', 'GBP/CAD', 'AUD/NZD', 'AUD/CAD', 'NZD/CAD'
    ];

    console.log(`Fetching real market data for ${symbols.length} currency pairs from FastForex`);

    // Fetch real-time data from FastForex API
    const fastForexUrl = `https://api.fastforex.io/fetch-multi?pairs=${symbols.join(',')}&api_key=${fastForexApiKey}`;
    
    console.log('Calling FastForex API...');
    const response = await fetch(fastForexUrl);
    
    if (!response.ok) {
      throw new Error(`FastForex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('FastForex API response received:', data);

    if (!data.results || Object.keys(data.results).length === 0) {
      throw new Error('No forex data received from FastForex API');
    }

    // Transform FastForex data to our format
    const marketDataBatch = Object.entries(data.results).map(([pair, rate]) => {
      const symbol = pair.replace('/', ''); // Convert EUR/USD to EURUSD
      const price = parseFloat(rate as string);
      
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
    });

    console.log(`Processed ${marketDataBatch.length} forex pairs from FastForex`);

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
        base_currency: data.base
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
