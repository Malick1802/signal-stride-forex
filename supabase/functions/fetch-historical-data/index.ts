import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const alphaKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');

    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env');
    if (!alphaKey) throw new Error('Missing ALPHA_VANTAGE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const symbols: string[] = body.symbols || [
      'EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD'
    ];
    const timeframe: string = (body.timeframe || '1D').toUpperCase();
    const years: number = Math.min(Math.max(body.years || 5, 1), 10);

    if (timeframe !== '1D') {
      return new Response(JSON.stringify({ error: 'Only 1D timeframe supported in this version' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const since = new Date();
    since.setUTCFullYear(since.getUTCFullYear() - years);

    let totalInserted = 0;
    for (const sym of symbols) {
      const from = sym.slice(0,3);
      const to = sym.slice(3);
      const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${alphaKey}`;

      console.log(`📥 Fetching ${sym} (FX_DAILY full)`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Alpha Vantage error ${res.status}`);
      const data = await res.json();
      const series = data["Time Series FX (Daily)"];
      if (!series) {
        console.log(`⚠️ No series for ${sym}`);
        continue;
      }

      const rows: any[] = [];
      for (const [dateStr, ohlc] of Object.entries<any>(series)) {
        const ts = new Date(dateStr + 'T00:00:00Z');
        if (ts < since) continue;
        rows.push({
          symbol: sym,
          timeframe: '1D',
          timestamp: ts.toISOString(),
          open_price: parseFloat(ohlc['1. open']),
          high_price: parseFloat(ohlc['2. high']),
          low_price: parseFloat(ohlc['3. low']),
          close_price: parseFloat(ohlc['4. close']),
          volume: 0,
          source: 'alpha_vantage',
        });
      }

      // Batch upsert
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await supabase
          .from('historical_market_data')
          .upsert(chunk, { onConflict: 'symbol,timeframe,timestamp' });
        if (error) throw error;
        totalInserted += chunk.length;
      }

      console.log(`✅ ${sym}: upserted ${rows.length} rows`);
    }

    return new Response(JSON.stringify({ status: 'ok', timeframe, years, symbols, inserted: totalInserted }), {
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