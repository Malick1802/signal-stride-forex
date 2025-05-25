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
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting market data fetch...');

    // Check if forex markets are open (Sunday 22:00 UTC to Friday 22:00 UTC)
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Forex market is open from Sunday 22:00 UTC to Friday 22:00 UTC
    let isMarketOpen = false;
    
    if (utcDay === 0) { // Sunday
      isMarketOpen = utcHour >= 22; // Sunday 22:00+ (Monday open in Sydney)
    } else if (utcDay >= 1 && utcDay <= 4) { // Monday to Thursday
      isMarketOpen = true; // Always open
    } else if (utcDay === 5) { // Friday
      isMarketOpen = utcHour < 22; // Friday before 22:00
    } else if (utcDay === 6) { // Saturday
      isMarketOpen = false; // Always closed
    }

    console.log(`Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'} (Day: ${utcDay}, Hour: ${utcHour})`);

    // Expanded list to include all pairs that might be used in signals
    const allForexPairs = [
      // Major pairs
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      // Cross pairs
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'EURAUD', 'EURNZD', 'EURCAD',
      'GBPAUD', 'GBPNZD', 'GBPCAD', 'AUDCHF', 'CADJPY', 'CHFJPY', 'AUDNZD', 'AUDCAD',
      'NZDCAD', 'NZDJPY', 'NZDCHF', 'CADCHF'
    ];

    console.log(`Fetching data for ${allForexPairs.length} currency pairs:`, allForexPairs);

    let marketDataBatch = [];

    // Try to fetch real data from FastForex if API key is available
    if (fastForexApiKey) {
      try {
        const symbolsParam = allForexPairs.join(',');
        const url = `https://api.fastforex.io/fetch-multi?pairs=${symbolsParam}&api_key=${fastForexApiKey}`;
        
        console.log('Attempting to fetch from FastForex API...');
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log('FastForex API response received successfully');

          if (data.results && Object.keys(data.results).length > 0) {
            // Transform and prepare the data
            marketDataBatch = Object.entries(data.results).map(([symbol, rates]: [string, any]) => {
              const price = parseFloat(rates.c || rates.o || 0);
              const spread = price * 0.0001; // Estimated 1 pip spread
              
              return {
                symbol,
                price,
                bid: parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5)),
                ask: parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5)),
                source: 'fastforex',
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString()
              };
            });

            console.log(`Successfully processed ${marketDataBatch.length} real market data records`);
          }
        } else {
          console.log(`FastForex API returned ${response.status}: ${response.statusText}`);
          throw new Error(`FastForex API error: ${response.status} ${response.statusText}`);
        }
      } catch (apiError) {
        console.error('FastForex API failed:', apiError);
        console.log('Falling back to mock data due to API failure');
      }
    } else {
      console.log('No FastForex API key found, using mock data');
    }

    // If no real data was fetched, generate realistic mock data
    if (marketDataBatch.length === 0) {
      console.log('Generating realistic mock data for all currency pairs');
      
      marketDataBatch = allForexPairs.map(symbol => {
        // Generate realistic base rates for different currency pairs
        let baseRate;
        if (symbol.includes('JPY')) {
          // JPY pairs: typically 100-160 range
          baseRate = 110 + (Math.random() * 50);
        } else if (symbol.startsWith('EUR')) {
          // EUR pairs: typically 0.8-1.3 range
          baseRate = 0.9 + (Math.random() * 0.4);
        } else if (symbol.startsWith('GBP')) {
          // GBP pairs: typically 1.1-1.4 range
          baseRate = 1.15 + (Math.random() * 0.25);
        } else if (symbol.startsWith('AUD') || symbol.startsWith('NZD')) {
          // AUD/NZD pairs: typically 0.6-0.8 range
          baseRate = 0.65 + (Math.random() * 0.15);
        } else if (symbol.startsWith('USD')) {
          // USD pairs: typically 0.8-1.4 range
          baseRate = 0.8 + (Math.random() * 0.6);
        } else {
          // Cross pairs: variable range
          baseRate = 0.7 + (Math.random() * 0.8);
        }
        
        const spread = baseRate * 0.0001; // 1 pip spread
        const price = parseFloat(baseRate.toFixed(symbol.includes('JPY') ? 3 : 5));
        const bid = parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));
        const ask = parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));

        return {
          symbol,
          price,
          bid,
          ask,
          source: 'mock',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
      });

      console.log(`Generated ${marketDataBatch.length} mock market data records`);
    }

    // Insert market data into database
    const { error: insertError } = await supabase
      .from('live_market_data')
      .insert(marketDataBatch);

    if (insertError) {
      console.error('Error inserting market data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert market data', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully inserted ${marketDataBatch.length} market data records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fetched ${marketDataBatch.length} currency pairs successfully`,
        pairs: marketDataBatch.map(item => item.symbol),
        source: marketDataBatch[0]?.source || 'mock',
        marketOpen: isMarketOpen,
        timestamp: new Date().toISOString()
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
