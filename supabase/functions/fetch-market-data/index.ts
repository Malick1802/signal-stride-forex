
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
    const fastforexApiKey = Deno.env.get('FASTFOREX_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Major forex pairs to fetch
    const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    
    for (const pair of pairs) {
      try {
        console.log(`Fetching data for ${pair}`);
        
        // Fetch real-time data from FastForex
        const response = await fetch(
          `https://api.fastforex.io/fetch-one?from=${pair.slice(0,3)}&to=${pair.slice(3,6)}&api_key=${fastforexApiKey}`
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch ${pair}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`FastForex response for ${pair}:`, data);
        
        if (data.result && data.result[pair]) {
          // Store the market data
          const { error: insertError } = await supabase
            .from('live_market_data')
            .insert({
              symbol: pair,
              price: parseFloat(data.result[pair]),
              source: 'fastforex',
              timestamp: new Date().toISOString()
            });

          if (insertError) {
            console.error(`Error inserting market data for ${pair}:`, insertError);
          } else {
            console.log(`Successfully stored market data for ${pair}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${pair}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Market data fetched and stored' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-market-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
