import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FourHourCandle {
  symbol: string;
  timeframe: string;
  timestamp: Date;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const symbols: string[] = body.symbols || [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
      'EURGBP', 'GBPCAD', 'EURAUD', 'EURCAD', 'GBPAUD', 'CHFJPY', 'NZDJPY',
      'GBPNZD', 'AUDCHF', 'CADJPY', 'NZDCHF', 'NZDCAD', 'AUDNZD', 'AUDJPY',
      'EURNZD', 'EURJPY', 'CADCHF', 'EURCHF', 'GBPCHF', 'GBPJPY'
    ];

    console.log(`🕐 Aggregating 4H candles for ${symbols.length} symbols...`);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    let totalCandles = 0;
    const processedSymbols: string[] = [];

    for (const symbol of symbols) {
      try {
        // Fetch price history (1-minute updates from centralized-market-stream)
        const { data: priceHistory, error: fetchError } = await supabase
          .from('live_price_history')
          .select('*')
          .eq('symbol', symbol)
          .gte('timestamp', sixMonthsAgo.toISOString())
          .order('timestamp', { ascending: true });

        if (fetchError) {
          console.error(`❌ Error fetching ${symbol}:`, fetchError);
          continue;
        }

        if (!priceHistory || priceHistory.length < 100) {
          console.log(`⚠️ Insufficient data for ${symbol}: ${priceHistory?.length || 0} points`);
          continue;
        }

        // Aggregate into 4H blocks (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
        const fourHourCandles: FourHourCandle[] = [];
        let currentCandle: FourHourCandle | null = null;

        for (const price of priceHistory) {
          const ts = new Date(price.timestamp);
          const fourHourBlock = Math.floor(ts.getUTCHours() / 4);
          const candleStart = new Date(ts);
          candleStart.setUTCHours(fourHourBlock * 4, 0, 0, 0);

          if (!currentCandle || currentCandle.timestamp.getTime() !== candleStart.getTime()) {
            if (currentCandle) {
              fourHourCandles.push(currentCandle);
            }

            currentCandle = {
              symbol,
              timeframe: '4H',
              timestamp: candleStart,
              open_price: price.price,
              high_price: price.price,
              low_price: price.price,
              close_price: price.price,
              volume: 0,
              source: 'live_price_history'
            };
          } else {
            currentCandle.high_price = Math.max(currentCandle.high_price, price.price);
            currentCandle.low_price = Math.min(currentCandle.low_price, price.price);
            currentCandle.close_price = price.price;
          }
        }

        // Add the last candle
        if (currentCandle) {
          fourHourCandles.push(currentCandle);
        }

        if (fourHourCandles.length > 0) {
          // Upsert to database in batches
          for (let i = 0; i < fourHourCandles.length; i += 500) {
            const chunk = fourHourCandles.slice(i, i + 500);
            const { error: upsertError } = await supabase
              .from('multi_timeframe_data')
              .upsert(
                chunk.map(c => ({
                  ...c,
                  timestamp: c.timestamp.toISOString()
                })),
                { onConflict: 'symbol,timeframe,timestamp' }
              );

            if (upsertError) {
              console.error(`❌ Upsert error for ${symbol}:`, upsertError);
              break;
            }
          }

          totalCandles += fourHourCandles.length;
          processedSymbols.push(symbol);
          console.log(`✅ ${symbol}: ${fourHourCandles.length} 4H candles (from ${priceHistory.length} price points)`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }

    console.log(`\n📊 Summary: ${totalCandles} 4H candles created for ${processedSymbols.length}/${symbols.length} symbols`);

    return new Response(
      JSON.stringify({
        success: true,
        totalCandles,
        processedSymbols: processedSymbols.length,
        totalSymbols: symbols.length,
        symbols: processedSymbols
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err: any) {
    console.error('❌ aggregate-4h-candles error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
