
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

    // Check if forex markets are open
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                        (utcDay === 0 && utcHour >= 22) || 
                        (utcDay === 5 && utcHour < 22);

    console.log(`Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'} (Day: ${utcDay}, Hour: ${utcHour})`);

    const symbols = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
      'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF',
      'AUDCHF', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD',
      'GBPAUD', 'GBPNZD', 'GBPCAD', 'AUDNZD', 'AUDCAD', 'AUDSGD',
      'NZDCAD', 'NZDCHF', 'CADCHF', 'USDSEK', 'USDNOK', 'USDDKK'
    ];

    console.log(`Generating realistic market data for ${symbols.length} currency pairs`);

    // Get previous prices to calculate realistic movements
    const { data: previousData } = await supabase
      .from('live_market_data')
      .select('symbol, price')
      .in('symbol', symbols)
      .order('created_at', { ascending: false })
      .limit(symbols.length);

    const previousPrices: Record<string, number> = {};
    if (previousData) {
      previousData.forEach(item => {
        if (!previousPrices[item.symbol]) {
          previousPrices[item.symbol] = parseFloat(item.price.toString());
        }
      });
    }

    // Generate realistic market data with proper price movements
    const marketDataBatch = symbols.map(symbol => {
      // Get base prices that are realistic for each pair
      const basePrices: Record<string, number> = {
        'EURUSD': 1.08500, 'GBPUSD': 1.26500, 'USDJPY': 148.500,
        'AUDUSD': 0.67200, 'USDCAD': 1.35800, 'USDCHF': 0.89200,
        'NZDUSD': 0.62100, 'EURGBP': 0.85900, 'EURJPY': 161.200,
        'GBPJPY': 187.800, 'EURCHF': 0.96800, 'GBPCHF': 1.12900,
        'AUDCHF': 0.59800, 'CADJPY': 109.400, 'CHFJPY': 166.300,
        'EURAUD': 1.61500, 'EURNZD': 1.74800, 'EURCAD': 1.47300,
        'GBPAUD': 1.88200, 'GBPNZD': 2.03600, 'GBPCAD': 1.71700,
        'AUDNZD': 1.08200, 'AUDCAD': 0.91300, 'AUDSGD': 0.90100,
        'NZDCAD': 0.84300, 'NZDCHF': 0.55200, 'CADCHF': 0.65700,
        'USDSEK': 10.95000, 'USDNOK': 11.15000, 'USDDKK': 7.08000
      };

      const basePrice = basePrices[symbol] || 1.0000;
      const previousPrice = previousPrices[symbol] || basePrice;
      
      // Calculate realistic price movement (0.01% to 0.1% change)
      const maxChange = isMarketOpen ? 0.001 : 0.0002; // Larger moves when market is open
      const priceChange = (Math.random() - 0.5) * maxChange;
      const newPrice = previousPrice * (1 + priceChange);
      
      // Ensure price stays within reasonable bounds
      const minPrice = basePrice * 0.98;
      const maxPrice = basePrice * 1.02;
      const finalPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
      
      const spread = finalPrice * (symbol.includes('JPY') ? 0.002 : 0.00002);
      const price = parseFloat(finalPrice.toFixed(symbol.includes('JPY') ? 3 : 5));
      const bid = parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));
      const ask = parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));

      return {
        symbol,
        price,
        bid,
        ask,
        source: 'realtime_simulation',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
    });

    // Clear old data (keep only last 100 records per symbol)
    for (const symbol of symbols) {
      const { data: oldRecords } = await supabase
        .from('live_market_data')
        .select('id')
        .eq('symbol', symbol)
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

    console.log(`Successfully inserted ${marketDataBatch.length} market data records`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${marketDataBatch.length} currency pairs with real-time simulation data`,
        pairs: symbols,
        marketOpen: isMarketOpen,
        timestamp: new Date().toISOString(),
        source: 'realtime_simulation'
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
