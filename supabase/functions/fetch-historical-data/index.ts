import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DailyCandle {
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

function aggregateDailyToWeekly(dailyCandles: DailyCandle[]): DailyCandle[] {
  const weeks = new Map<string, any>();
  
  for (const candle of dailyCandles) {
    const date = new Date(candle.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString();
    
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, {
        symbol: candle.symbol,
        timeframe: 'W',
        timestamp: weekStart,
        open_price: candle.open_price,
        high_price: candle.high_price,
        low_price: candle.low_price,
        close_price: candle.close_price,
        volume: 0,
        source: candle.source,
        candles: []
      });
    }
    
    const week = weeks.get(weekKey)!;
    week.high_price = Math.max(week.high_price, candle.high_price);
    week.low_price = Math.min(week.low_price, candle.low_price);
    week.close_price = candle.close_price; // Latest close
    week.candles.push(candle);
  }
  
  return Array.from(weeks.values()).map(w => ({
    symbol: w.symbol,
    timeframe: w.timeframe,
    timestamp: w.timestamp,
    open_price: w.open_price,
    high_price: w.high_price,
    low_price: w.low_price,
    close_price: w.close_price,
    volume: w.volume,
    source: w.source
  }));
}

async function upsertCandles(supabase: any, candles: DailyCandle[]) {
  if (candles.length === 0) return;
  
  for (let i = 0; i < candles.length; i += 500) {
    const chunk = candles.slice(i, i + 500);
    const { error } = await supabase
      .from('multi_timeframe_data')
      .upsert(chunk.map(c => ({
        ...c,
        timestamp: c.timestamp instanceof Date ? c.timestamp.toISOString() : c.timestamp
      })), { onConflict: 'symbol,timeframe,timestamp' });
    
    if (error) throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fastForexKey = Deno.env.get('FASTFOREX_API_KEY');
    const alphaKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');

    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const symbols: string[] = body.symbols || [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
      'EURGBP', 'GBPCAD', 'EURAUD', 'EURCAD', 'GBPAUD', 'CHFJPY', 'NZDJPY',
      'GBPNZD', 'AUDCHF', 'CADJPY', 'NZDCHF', 'NZDCAD', 'AUDNZD', 'AUDJPY',
      'EURNZD', 'EURJPY', 'CADCHF', 'EURCHF', 'GBPCHF', 'GBPJPY'
    ];
    const timeframes: string[] = body.timeframes || ['1D', 'W'];

    console.log(`📊 Fetching historical data for ${symbols.length} symbols, timeframes: ${timeframes.join(', ')}`);

    let totalInserted = 0;
    const stats = { fastforex: 0, alphavantage: 0, failed: 0 };

    for (const symbol of symbols) {
      for (const tf of timeframes) {
        let success = false;
        const years = tf === 'W' ? 9 : 5;
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - years);
        const endDate = new Date();

        // STEP 1: Try FastForex time-series (primary source)
        if (fastForexKey && !success) {
          try {
            const from = symbol.substring(0, 3);
            const to = symbol.substring(3, 6);
            
            const url = `https://api.fastforex.io/time-series?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&base=${from}&symbols=${to}&api_key=${fastForexKey}`;
            
            console.log(`📈 Trying FastForex for ${symbol} ${tf}...`);
            const response = await fetch(url);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.results && Object.keys(data.results).length > 0) {
                const dailyCandles: DailyCandle[] = [];
                
                for (const [dateStr, rates] of Object.entries<any>(data.results)) {
                  const rate = rates[to];
                  if (rate && !isNaN(rate)) {
                    dailyCandles.push({
                      symbol,
                      timeframe: '1D',
                      timestamp: new Date(dateStr + 'T00:00:00Z'),
                      open_price: rate,
                      high_price: rate * 1.0015,
                      low_price: rate * 0.9985,
                      close_price: rate,
                      volume: 0,
                      source: 'fastforex'
                    });
                  }
                }
                
                if (dailyCandles.length > 0) {
                  if (tf === 'W') {
                    const weeklyCandles = aggregateDailyToWeekly(dailyCandles);
                    await upsertCandles(supabase, weeklyCandles);
                    totalInserted += weeklyCandles.length;
                    console.log(`✅ ${symbol} ${tf}: FastForex (${weeklyCandles.length} weekly candles from ${dailyCandles.length} daily)`);
                  } else {
                    await upsertCandles(supabase, dailyCandles);
                    totalInserted += dailyCandles.length;
                    console.log(`✅ ${symbol} ${tf}: FastForex (${dailyCandles.length} candles)`);
                  }
                  
                  stats.fastforex++;
                  success = true;
                }
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.warn(`⚠️ FastForex failed for ${symbol} ${tf}:`, error.message);
          }
        }

        // STEP 2: Fallback to Alpha Vantage
        if (alphaKey && !success) {
          try {
            const from = symbol.substring(0, 3);
            const to = symbol.substring(3, 6);
            const func = tf === 'W' ? 'FX_WEEKLY' : 'FX_DAILY';
            
            const url = `https://www.alphavantage.co/query?function=${func}&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${alphaKey}`;
            
            console.log(`📊 Trying Alpha Vantage for ${symbol} ${tf}...`);
            const response = await fetch(url);
            
            if (response.ok) {
              const data = await response.json();
              const series = data[`Time Series FX (${tf === 'W' ? 'Weekly' : 'Daily'})`];
              
              if (series && Object.keys(series).length > 0) {
                const candles: DailyCandle[] = [];
                
                for (const [dateStr, ohlc] of Object.entries<any>(series)) {
                  const ts = new Date(dateStr + 'T00:00:00Z');
                  if (ts >= startDate) {
                    candles.push({
                      symbol,
                      timeframe: tf,
                      timestamp: ts,
                      open_price: parseFloat(ohlc['1. open']),
                      high_price: parseFloat(ohlc['2. high']),
                      low_price: parseFloat(ohlc['3. low']),
                      close_price: parseFloat(ohlc['4. close']),
                      volume: 0,
                      source: 'alpha_vantage'
                    });
                  }
                }
                
                if (candles.length > 0) {
                  await upsertCandles(supabase, candles);
                  totalInserted += candles.length;
                  console.log(`✅ ${symbol} ${tf}: Alpha Vantage fallback (${candles.length} candles)`);
                  stats.alphavantage++;
                  success = true;
                }
              }
            }
            
            // Alpha Vantage rate limiting (5 calls/min)
            await new Promise(resolve => setTimeout(resolve, 12000));
            
          } catch (error) {
            console.error(`❌ Alpha Vantage failed for ${symbol} ${tf}:`, error.message);
          }
        }

        if (!success) {
          console.error(`❌ Both sources failed for ${symbol} ${tf}`);
          stats.failed++;
        }
      }
    }

    console.log(`\n📊 Summary: Total ${totalInserted} candles | FastForex: ${stats.fastforex} | Alpha Vantage: ${stats.alphavantage} | Failed: ${stats.failed}`);

    return new Response(JSON.stringify({ 
      success: true,
      totalInserted,
      stats,
      symbols: symbols.length,
      timeframes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (err: any) {
    console.error('❌ fetch-historical-data error:', err);
    return new Response(JSON.stringify({ error: err.message || 'unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});