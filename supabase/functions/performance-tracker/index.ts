import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🎯 Performance Tracker Started');

    // Track signal outcomes and update performance metrics
    const { data: recentOutcomes, error: outcomesError } = await supabaseClient
      .from('signal_outcomes')
      .select(`
        *,
        trading_signals!inner(symbol, type, price, stop_loss, take_profits, metadata, timestamp)
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .is('processed_by_tracker', null);

    if (outcomesError) {
      console.error('Error fetching signal outcomes:', outcomesError);
      return new Response(JSON.stringify({ error: outcomesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Processing ${recentOutcomes?.length || 0} recent signal outcomes`);

    let trackedSignals = 0;
    let performanceUpdates = 0;

    // Process each signal outcome
    for (const outcome of recentOutcomes || []) {
      const signal = outcome.trading_signals;
      
      // Extract parameters used from signal metadata
      const parametersUsed = signal.metadata?.parameters_used;
      const marketSession = signal.metadata?.market_session || 'unknown';
      const volatilityRegime = signal.metadata?.volatility_regime || 'normal';

      // Determine outcome type
      let outcomeType = 'loss';
      let pipsResult = outcome.pnl_pips || 0;
      let exitReason = 'unknown';

      if (outcome.hit_target) {
        outcomeType = 'win';
        exitReason = `take_profit_${outcome.target_hit_level || 1}`;
      } else if (outcome.notes?.toLowerCase().includes('stop')) {
        outcomeType = 'loss';
        exitReason = 'stop_loss';
      } else if (pipsResult === 0) {
        outcomeType = 'breakeven';
        exitReason = 'breakeven';
      }

      // Calculate duration in hours
      const signalTime = new Date(signal.timestamp);
      const outcomeTime = new Date(outcome.created_at);
      const durationHours = Math.round((outcomeTime.getTime() - signalTime.getTime()) / (1000 * 60 * 60));

      // Insert into signal_performance_tracking
      const { error: trackingError } = await supabaseClient
        .from('signal_performance_tracking')
        .insert({
          signal_id: outcome.signal_id,
          symbol: signal.symbol,
          signal_type: signal.type,
          entry_price: signal.price,
          exit_price: outcome.exit_price,
          stop_loss_price: signal.stop_loss,
          take_profit_prices: signal.take_profits,
          outcome: outcomeType,
          pips_result: pipsResult,
          duration_hours: durationHours,
          market_session: marketSession,
          volatility_regime: volatilityRegime,
          parameters_used: parametersUsed,
          confidence_score: signal.metadata?.tier3_confidence || signal.metadata?.tier2_confidence,
          exit_reason: exitReason,
          signal_generated_at: signal.timestamp,
          signal_closed_at: outcome.created_at
        });

      if (trackingError) {
        console.error(`Failed to track signal ${outcome.signal_id}:`, trackingError);
        continue;
      }

      trackedSignals++;

      // Update performance metrics for the symbol's optimal parameters
      if (parametersUsed) {
        await updateParameterPerformance(supabaseClient, signal.symbol, parametersUsed, outcomeType, pipsResult, marketSession, volatilityRegime);
        performanceUpdates++;
      }

      // Mark outcome as processed
      await supabaseClient
        .from('signal_outcomes')
        .update({ processed_by_tracker: 'performance_tracker' })
        .eq('id', outcome.id);
    }

    // Generate performance summary for last 30 days
    const performanceSummary = await generatePerformanceSummary(supabaseClient);

    console.log(`✅ Performance tracking complete: ${trackedSignals} signals tracked, ${performanceUpdates} parameters updated`);

    return new Response(
      JSON.stringify({
        success: true,
        signals_tracked: trackedSignals,
        performance_updates: performanceUpdates,
        performance_summary: performanceSummary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Performance tracker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function updateParameterPerformance(
  supabase: any, 
  symbol: string, 
  parameters: any, 
  outcome: string, 
  pips: number,
  session: string,
  volatilityRegime: string
) {
  try {
    // Get current optimal parameters for this symbol
    const { data: currentParams, error: fetchError } = await supabase
      .from('optimal_trading_parameters')
      .select('*')
      .eq('symbol', symbol)
      .eq('market_session', session)
      .eq('volatility_regime', volatilityRegime)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching current parameters:', fetchError);
      return;
    }

    if (!currentParams) {
      console.log(`No optimal parameters found for ${symbol} in ${session} session`);
      return;
    }

    // Calculate updated performance metrics
    const totalTrades = currentParams.total_trades + 1;
    const newWinningTrades = currentParams.total_trades * currentParams.win_rate + (outcome === 'win' ? 1 : 0);
    const newWinRate = newWinningTrades / totalTrades;
    
    // Update rolling averages for win/loss pips
    const newAvgWinPips = outcome === 'win' 
      ? ((currentParams.avg_win_pips * (newWinningTrades - 1)) + pips) / newWinningTrades
      : currentParams.avg_win_pips;
    
    const losingTrades = totalTrades - newWinningTrades;
    const newAvgLossPips = outcome === 'loss' && losingTrades > 0
      ? ((currentParams.avg_loss_pips * (losingTrades - 1)) + Math.abs(pips)) / losingTrades
      : currentParams.avg_loss_pips;

    // Calculate profit factor
    const totalWinPips = newWinningTrades * newAvgWinPips;
    const totalLossPips = losingTrades * newAvgLossPips;
    const profitFactor = totalLossPips > 0 ? totalWinPips / totalLossPips : totalWinPips;

    // Update the optimal parameters with new performance data
    const { error: updateError } = await supabase
      .from('optimal_trading_parameters')
      .update({
        total_trades: totalTrades,
        win_rate: newWinRate,
        avg_win_pips: newAvgWinPips,
        avg_loss_pips: newAvgLossPips,
        profit_factor: profitFactor,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentParams.id);

    if (updateError) {
      console.error('Error updating parameter performance:', updateError);
    } else {
      console.log(`📈 Updated performance for ${symbol}: Win Rate ${(newWinRate * 100).toFixed(1)}%, Profit Factor ${profitFactor.toFixed(2)}`);
    }

  } catch (error) {
    console.error('Error in updateParameterPerformance:', error);
  }
}

async function generatePerformanceSummary(supabase: any) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get performance summary for last 30 days
    const { data: summary, error } = await supabase
      .from('signal_performance_tracking')
      .select('outcome, pips_result, symbol, market_session')
      .gte('signal_generated_at', thirtyDaysAgo);

    if (error) {
      console.error('Error generating performance summary:', error);
      return null;
    }

    const totalSignals = summary.length;
    const wins = summary.filter(s => s.outcome === 'win').length;
    const losses = summary.filter(s => s.outcome === 'loss').length;
    const winRate = totalSignals > 0 ? (wins / totalSignals) * 100 : 0;
    
    const totalPips = summary.reduce((sum, s) => sum + (s.pips_result || 0), 0);
    const avgPipsPerSignal = totalSignals > 0 ? totalPips / totalSignals : 0;

    // Performance by symbol
    const symbolPerformance = summary.reduce((acc, signal) => {
      if (!acc[signal.symbol]) {
        acc[signal.symbol] = { total: 0, wins: 0, pips: 0 };
      }
      acc[signal.symbol].total++;
      if (signal.outcome === 'win') acc[signal.symbol].wins++;
      acc[signal.symbol].pips += signal.pips_result || 0;
      return acc;
    }, {});

    return {
      total_signals: totalSignals,
      win_rate: winRate,
      total_pips: totalPips,
      avg_pips_per_signal: avgPipsPerSignal,
      symbol_performance: symbolPerformance,
      period: '30_days'
    };

  } catch (error) {
    console.error('Error in generatePerformanceSummary:', error);
    return null;
  }
}