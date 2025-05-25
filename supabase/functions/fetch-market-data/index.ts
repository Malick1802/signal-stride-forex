
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting market data fetch...');

    // Check if forex markets are open (Monday 00:00 UTC to Friday 22:00 UTC)
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || // Monday to Thursday
                        (utcDay === 0 && utcHour >= 22) || // Sunday 22:00+ (Monday open)
                        (utcDay === 5 && utcHour < 22); // Friday before 22:00

    console.log(`Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'} (Day: ${utcDay}, Hour: ${utcHour})`);

    // Always generate mock data for demo purposes since FastForex API is having issues
    const symbols = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
      'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF',
      'AUDCHF', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD',
      'GBPAUD', 'GBPNZD', 'GBPCAD', 'AUDNZD', 'AUDCAD', 'AUDSGD',
      'NZDCAD', 'NZDCHF', 'CADCHF', 'USDSEK', 'USDNOK', 'USDDKK'
    ];

    console.log(`Generating mock data for ${symbols.length} currency pairs`);

    // Generate realistic mock data for all pairs
    const marketDataBatch = symbols.map(symbol => {
      const baseRate = symbol.includes('JPY') ? 
        (Math.random() * 50 + 100) : // JPY pairs: 100-150
        (Math.random() * 2 + 0.5);   // Other pairs: 0.5-2.5
      
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

    const { error: insertError } = await supabase
      .from('live_market_data')
      .insert(marketDataBatch);

    if (insertError) {
      console.error('Error inserting mock market data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert market data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully inserted ${marketDataBatch.length} mock market data records`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fetched ${marketDataBatch.length} currency pairs (mock data)`,
        pairs: symbols,
        marketOpen: isMarketOpen
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
