import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Candle = { timestamp: string; close_price: number };

function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(prev);
  for (let i = period; i < values.length; i++) {
    const val = values[i] * k + prev * (1 - k);
    ema.push(val);
    prev = val;
  }
  return Array(period - 1).fill(values[period - 1]).concat(ema);
}

function calculateRSI(values: number[], period: number = 14): number[] {
  if (values.length < period + 1) return Array(values.length).fill(50);
  const changes = values.slice(1).map((p, i) => p - values[i]);
  const gains = changes.map(c => (c > 0 ? c : 0));
  const losses = changes.map(c => (c < 0 ? -c : 0));
  const rsi: number[] = Array(period).fill(50);
  for (let i = period; i < values.length; i++) {
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const rs = avgLoss === 0 ? 1000 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

function computeATRApprox(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 2) return Array(prices.length).fill(0);
  const trs: number[] = [0];
  for (let i = 1; i < prices.length; i++) trs.push(Math.abs(prices[i] - prices[i - 1]));
  const atr: number[] = Array(period).fill(0);
  for (let i = period; i < trs.length; i++) {
    const val = trs.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    atr.push(val);
  }
  return atr;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));

    const symbols: string[] = body.symbols || ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD'];
    const timeframe: string = (body.timeframe || '1D').toUpperCase();
    const params = body.parameters || { rsiBuy: 30, rsiSell: 70 };
    const configName: string = body.configName || `grid-${Date.now()}`;
    const periodStart = body.testStart || '2018-01-01';
    const periodEnd = body.testEnd || new Date().toISOString().slice(0,10);

    let totalTrades = 0, wins = 0, losses = 0, grossWin = 0, grossLoss = 0;

    for (const sym of symbols) {
      const { data, error } = await supabase
        .from('historical_market_data')
        .select('timestamp, close_price')
        .eq('symbol', sym)
        .eq('timeframe', timeframe)
        .gte('timestamp', `${periodStart}T00:00:00Z`)
        .lte('timestamp', `${periodEnd}T23:59:59Z`)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      const candles: Candle[] = (data || []) as any;
      if (candles.length < 260) continue;

      const closes = candles.map(c => Number(c.close_price));
      const ema50 = calculateEMA(closes, 50);
      const ema200 = calculateEMA(closes, 200);
      const rsi = calculateRSI(closes, 14);
      const atr = computeATRApprox(closes, 14);

      for (let i = 200; i < closes.length - 2; i++) {
        const price = closes[i];
        const trendUp = price > ema50[i] && ema50[i] > ema200[i];
        const trendDown = price < ema50[i] && ema50[i] < ema200[i];
        const buy = rsi[i] < (params.rsiBuy || 30) && trendUp;
        const sell = rsi[i] > (params.rsiSell || 70) && trendDown;
        if (!buy && !sell) continue;

        const entry = closes[i + 1]; // next bar open proxy
        const riskPct = 0.015;
        const riskDistance = Math.min(Math.max(entry * riskPct, 0.5 * atr[i]), 3 * atr[i]);
        const stop = buy ? entry - riskDistance : entry + riskDistance;
        const tps = [1.5, 2, 3].map(m => buy ? entry + m * riskDistance : entry - m * riskDistance);

        // forward simulate until SL or any TP is hit
        let outcome: 'win' | 'loss' | null = null;
        for (let j = i + 2; j < closes.length; j++) {
          const c = closes[j];
          if (buy) {
            if (c <= stop) { outcome = 'loss'; break; }
            if (c >= tps[0]) { outcome = 'win'; break; }
          } else {
            if (c >= stop) { outcome = 'loss'; break; }
            if (c <= tps[0]) { outcome = 'win'; break; }
          }
        }
        if (!outcome) continue;

        totalTrades++;
        const risk = Math.abs(entry - stop);
        if (outcome === 'win') { wins++; grossWin += 1.5 * risk; } else { losses++; grossLoss += risk; }
      }
    }

    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : wins > 0 ? Infinity : 0;

    const { error: insertErr } = await supabase.from('backtesting_configurations').insert({
      config_name: configName,
      parameters: params,
      timeframe,
      test_period_start: periodStart,
      test_period_end: periodEnd,
      win_rate: winRate,
      profit_factor: profitFactor,
      max_drawdown_percent: null,
      sharpe_ratio: null,
      total_trades: totalTrades,
      winning_trades: wins,
      losing_trades: losses,
      testing_status: 'completed'
    });
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      status: 'ok', timeframe, symbols, metrics: { totalTrades, wins, losses, winRate, profitFactor }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('❌ run-backtests error:', err);
    return new Response(JSON.stringify({ error: err.message || 'unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});