// Incremental update of market structure trends when new candles arrive
// Triggered by cron jobs for W, 1D, and 4H timeframes

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
    
    const { timeframe } = await req.json();
    
    if (!timeframe || !['W', 'D', '4H'].includes(timeframe)) {
      return new Response(
        JSON.stringify({ error: 'Invalid timeframe. Must be W, D, or 4H' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`🔄 Updating market structure for ${timeframe} timeframe...`);
    
    const results = {
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Process all pairs sequentially to avoid overwhelming the system
    for (const symbol of MAJOR_PAIRS) {
      try {
        // Check if trend data exists for this symbol/timeframe
        const { data: existingTrend, error: fetchError } = await supabase
          .from('market_structure_trends')
          .select('last_candle_timestamp')
          .eq('symbol', symbol)
          .eq('timeframe', timeframe)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        
        // If no existing trend data, rebuild from scratch
        if (!existingTrend) {
          console.log(`📝 No existing trend for ${symbol} ${timeframe}, building from scratch...`);
          
          const { error: buildError } = await supabase.functions.invoke('build-market-structure', {
            body: { symbol, timeframe }
          });
          
          if (buildError) {
            console.error(`❌ Failed to build ${symbol} ${timeframe}:`, buildError);
            results.failed++;
            results.errors.push(`${symbol}: ${buildError.message}`);
          } else {
            console.log(`✅ Built new trend for ${symbol} ${timeframe}`);
            results.updated++;
          }
        } else {
          // Check for new candles since last update
          const { data: newCandles, error: candlesError } = await supabase
            .from('multi_timeframe_data')
            .select('timestamp')
            .eq('symbol', symbol)
            .eq('timeframe', timeframe)
            .gt('timestamp', existingTrend.last_candle_timestamp)
            .order('timestamp', { ascending: false })
            .limit(1);
          
          if (candlesError) {
            throw candlesError;
          }
          
          if (!newCandles || newCandles.length === 0) {
            console.log(`⏭️  No new candles for ${symbol} ${timeframe}`);
            results.skipped++;
          } else {
            // Rebuild trend with new data
            console.log(`🔄 Updating ${symbol} ${timeframe} (new candles detected)`);
            
            const { error: rebuildError } = await supabase.functions.invoke('build-market-structure', {
              body: { symbol, timeframe }
            });
            
            if (rebuildError) {
              console.error(`❌ Failed to update ${symbol} ${timeframe}:`, rebuildError);
              results.failed++;
              results.errors.push(`${symbol}: ${rebuildError.message}`);
            } else {
              console.log(`✅ Updated ${symbol} ${timeframe}`);
              results.updated++;
            }
          }
        }
        
        // Small delay to prevent database overload
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Exception processing ${symbol} ${timeframe}:`, error);
        results.failed++;
        results.errors.push(`${symbol}: ${error.message}`);
      }
    }
    
    console.log(`✅ Update complete for ${timeframe}`);
    console.log(`   Updated: ${results.updated}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Failed: ${results.failed}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        timeframe,
        results: {
          total: MAJOR_PAIRS.length,
          updated: results.updated,
          skipped: results.skipped,
          failed: results.failed,
          errors: results.errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in update-market-structure:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
