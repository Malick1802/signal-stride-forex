
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

    console.log('Starting market data fetch...');

    // Major forex pairs to fetch
    const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    const successfulInserts = [];
    
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
        
        // Extract price from the response
        let price = null;
        
        if (data.result) {
          // Handle both direct pair results and currency conversion results
          if (data.result[pair]) {
            price = data.result[pair];
          } else if (data.result[pair.slice(3,6)]) {
            price = data.result[pair.slice(3,6)];
          } else if (data.result.USD && pair.startsWith('USD')) {
            price = data.result.USD;
          } else if (data.result.EUR && pair.startsWith('EUR')) {
            price = data.result.EUR;
          } else if (data.result.GBP && pair.startsWith('GBP')) {
            price = data.result.GBP;
          } else if (data.result.AUD && pair.startsWith('AUD')) {
            price = data.result.AUD;
          } else if (data.result.NZD && pair.startsWith('NZD')) {
            price = data.result.NZD;
          }
        }

        if (price && !isNaN(parseFloat(price))) {
          const priceValue = parseFloat(price);
          console.log(`Storing ${pair} with price ${priceValue}`);
          
          // Store the market data with current timestamp
          const insertData = {
            symbol: pair,
            price: priceValue,
            source: 'fastforex',
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString()
          };

          console.log(`Insert data for ${pair}:`, insertData);

          const { data: insertResult, error: insertError } = await supabase
            .from('live_market_data')
            .insert(insertData)
            .select();

          if (insertError) {
            console.error(`Error inserting market data for ${pair}:`, insertError);
          } else {
            console.log(`Successfully stored market data for ${pair}:`, insertResult);
            successfulInserts.push(pair);
          }
        } else {
          console.error(`Invalid price data for ${pair}:`, { price, rawData: data });
        }
      } catch (error) {
        console.error(`Error processing ${pair}:`, error);
      }
    }

    // Verify data was inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('live_market_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Verification query result:', { count: verifyData?.length || 0, error: verifyError, data: verifyData });

    if (successfulInserts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No market data could be fetched and stored',
          details: 'All API requests failed or returned invalid data'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Market data fetched and stored for ${successfulInserts.length} pairs`,
        pairs: successfulInserts,
        totalRecordsInDB: verifyData?.length || 0
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
