// Batch fetch daily historical data for all major pairs
// Invokes fetch-historical-data for each symbol to populate multi_timeframe_data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAJOR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'EURNZD',
  'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD',
  'CHFJPY', 'CADJPY', 'AUDJPY', 'NZDJPY',
  'AUDCHF', 'AUDCAD', 'AUDNZD',
  'NZDCHF', 'NZDCAD'
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🚀 Starting batch fetch for daily historical data...');
    console.log(`   Processing ${MAJOR_PAIRS.length} pairs`);
    
    const results = {
      successful: 0,
      failed: 0,
      totalCandles: 0,
      errors: [] as string[]
    };
    
    // Process pairs sequentially to respect API rate limits
    for (const symbol of MAJOR_PAIRS) {
      try {
        console.log(`📊 Fetching ${symbol} daily data (1 year)...`);
        
        const { data, error } = await supabase.functions.invoke('fetch-historical-data', {
          body: { 
            symbol, 
            timeframe: '1D',
            yearsD: 1  // 1 year of daily data
          }
        });
        
        if (error) {
          console.error(`❌ ${symbol} failed:`, error);
          results.failed++;
          results.errors.push(`${symbol}: ${error.message}`);
        } else {
          console.log(`✅ ${symbol}: ${data.inserted || 0} candles inserted`);
          results.successful++;
          results.totalCandles += data.inserted || 0;
        }
        
        // Delay between requests to avoid rate limiting (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        console.error(`❌ Exception fetching ${symbol}:`, err);
        results.failed++;
        results.errors.push(`${symbol}: ${err.message}`);
      }
    }
    
    console.log('✅ Batch fetch complete!');
    console.log(`   Successful: ${results.successful}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Total candles: ${results.totalCandles}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        results: {
          total: MAJOR_PAIRS.length,
          successful: results.successful,
          failed: results.failed,
          totalCandles: results.totalCandles,
          errors: results.errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in batch-fetch-daily-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
