// One-time backfill of market structure trends for all symbols
// Processes all 27 currency pairs across W, 1D, and 4H timeframes

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

const TIMEFRAMES = ['W', '1D', '4H'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🚀 Starting market structure backfill for all symbols...');
    console.log(`   Processing ${MAJOR_PAIRS.length} pairs × ${TIMEFRAMES.length} timeframes = ${MAJOR_PAIRS.length * TIMEFRAMES.length} total operations`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Process in batches of 5 to avoid overwhelming the system
    const batchSize = 5;
    const totalOperations = MAJOR_PAIRS.length * TIMEFRAMES.length;
    
    for (let i = 0; i < MAJOR_PAIRS.length; i += batchSize) {
      const batchPairs = MAJOR_PAIRS.slice(i, i + batchSize);
      const batchPromises: Promise<any>[] = [];
      
      for (const symbol of batchPairs) {
        for (const timeframe of TIMEFRAMES) {
          batchPromises.push(
            supabase.functions.invoke('build-market-structure', {
              body: { symbol, timeframe }
            }).then(({ data, error }) => {
              if (error) {
                console.error(`❌ Failed ${symbol} ${timeframe}:`, error);
                results.failed++;
                results.errors.push(`${symbol} ${timeframe}: ${error.message}`);
              } else {
                console.log(`✅ Completed ${symbol} ${timeframe}: ${data.trend}`);
                results.successful++;
              }
            }).catch(err => {
              console.error(`❌ Exception ${symbol} ${timeframe}:`, err);
              results.failed++;
              results.errors.push(`${symbol} ${timeframe}: ${err.message}`);
            })
          );
        }
      }
      
      // Wait for current batch to complete
      await Promise.all(batchPromises);
      
      const progress = Math.min(((i + batchSize) * TIMEFRAMES.length) / totalOperations * 100, 100);
      console.log(`📊 Progress: ${progress.toFixed(1)}% (${results.successful + results.failed}/${totalOperations})`);
      
      // Small delay between batches to prevent overload
      if (i + batchSize < MAJOR_PAIRS.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('✅ Backfill complete!');
    console.log(`   Successful: ${results.successful}`);
    console.log(`   Failed: ${results.failed}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        results: {
          total: totalOperations,
          successful: results.successful,
          failed: results.failed,
          errors: results.errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in backfill-market-structure:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
