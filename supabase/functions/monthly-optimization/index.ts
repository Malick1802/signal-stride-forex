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

    console.log('🔄 Monthly Optimization Started');

    // 1. Run backtesting for all major pairs with latest data
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
    
    console.log(`📊 Running backtests for ${majorPairs.length} pairs from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Trigger enhanced backtesting
    const { data: backtestResult, error: backtestError } = await supabaseClient.functions.invoke(
      'run-backtests-enhanced',
      {
        body: {
          pairs: majorPairs,
          test_period_start: startDate.toISOString().split('T')[0],
          test_period_end: endDate.toISOString().split('T')[0],
          parameter_grid: {
            rsi_oversold: [25, 30, 35],
            rsi_overbought: [65, 70, 75],
            ema_fast: [8, 12, 16],
            ema_slow: [21, 26, 30],
            atr_period: [10, 14, 20],
            confluence_threshold: [2, 3, 4]
          }
        }
      }
    );

    if (backtestError) {
      console.error('Backtesting failed:', backtestError);
      return new Response(JSON.stringify({ error: 'Backtesting failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Backtesting completed successfully');

    // 2. Analyze live performance vs backtest predictions
    const performanceAnalysis = await analyzeLivePerformance(supabaseClient, majorPairs);

    // 3. Update optimal parameters based on recent performance
    const optimizationResults = await optimizeParameters(supabaseClient, majorPairs);

    // 4. Generate market regime analysis
    const marketRegimeAnalysis = await analyzeMarketRegime(supabaseClient);

    // 5. Store recalibration record
    const { error: recalibrationError } = await supabaseClient
      .from('monthly_recalibrations')
      .insert({
        recalibration_date: new Date().toISOString().split('T')[0],
        recalibration_reason: 'scheduled_monthly_optimization',
        market_regime_analysis: marketRegimeAnalysis,
        parameter_changes: optimizationResults.changes,
        performance_improvement: optimizationResults.improvement
      });

    if (recalibrationError) {
      console.error('Failed to store recalibration record:', recalibrationError);
    }

    console.log('🎯 Monthly optimization completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        backtest_results: backtestResult,
        performance_analysis: performanceAnalysis,
        optimization_results: optimizationResults,
        market_regime: marketRegimeAnalysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Monthly optimization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function analyzeLivePerformance(supabase: any, pairs: string[]) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const analysis = {};
    
    for (const pair of pairs) {
      // Get live performance for the last 30 days
      const { data: livePerformance, error } = await supabase
        .from('signal_performance_tracking')
        .select('outcome, pips_result, parameters_used')
        .eq('symbol', pair)
        .gte('signal_generated_at', thirtyDaysAgo);

      if (error) {
        console.error(`Error analyzing live performance for ${pair}:`, error);
        continue;
      }

      const totalSignals = livePerformance.length;
      const wins = livePerformance.filter(s => s.outcome === 'win').length;
      const winRate = totalSignals > 0 ? (wins / totalSignals) * 100 : 0;
      const totalPips = livePerformance.reduce((sum, s) => sum + (s.pips_result || 0), 0);

      // Get current optimal parameters performance
      const { data: optimalParams, error: paramsError } = await supabase
        .from('optimal_trading_parameters')
        .select('win_rate, profit_factor, total_trades')
        .eq('symbol', pair)
        .eq('market_session', 'all')
        .eq('volatility_regime', 'normal')
        .maybeSingle();

      if (!paramsError && optimalParams) {
        const backtestWinRate = optimalParams.win_rate * 100;
        const performanceDifference = winRate - backtestWinRate;

        analysis[pair] = {
          live_signals: totalSignals,
          live_win_rate: winRate,
          live_total_pips: totalPips,
          backtest_win_rate: backtestWinRate,
          performance_difference: performanceDifference,
          needs_reoptimization: Math.abs(performanceDifference) > 15 // Flag for reoptimization if >15% difference
        };
      }
    }

    return analysis;
  } catch (error) {
    console.error('Error in analyzeLivePerformance:', error);
    return {};
  }
}

async function optimizeParameters(supabase: any, pairs: string[]) {
  try {
    const changes = [];
    let totalImprovement = 0;
    let optimizedPairs = 0;

    for (const pair of pairs) {
      // Get current optimal parameters
      const { data: currentParams, error: currentError } = await supabase
        .from('optimal_trading_parameters')
        .select('*')
        .eq('symbol', pair)
        .eq('market_session', 'all')
        .eq('volatility_regime', 'normal')
        .maybeSingle();

      if (currentError || !currentParams) {
        console.log(`No current parameters found for ${pair}, skipping optimization`);
        continue;
      }

      // Get best recent backtest results for this pair
      const { data: recentBacktests, error: backtestError } = await supabase
        .from('backtesting_results')
        .select('*')
        .eq('symbol', pair)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('profit_factor', { ascending: false })
        .order('win_rate', { ascending: false })
        .limit(1);

      if (backtestError || !recentBacktests || recentBacktests.length === 0) {
        console.log(`No recent backtest results for ${pair}, keeping current parameters`);
        continue;
      }

      const bestBacktest = recentBacktests[0];
      
      // Check if new parameters are significantly better
      const improvementThreshold = 0.1; // 10% improvement required
      const profitFactorImprovement = bestBacktest.profit_factor - currentParams.profit_factor;
      const winRateImprovement = bestBacktest.win_rate - currentParams.win_rate;

      if (profitFactorImprovement > improvementThreshold || winRateImprovement > 0.05) {
        // Update parameters with better backtest results
        const { error: updateError } = await supabase
          .from('optimal_trading_parameters')
          .update({
            rsi_oversold: bestBacktest.parameters.rsi_oversold,
            rsi_overbought: bestBacktest.parameters.rsi_overbought,
            ema_fast_period: bestBacktest.parameters.ema_fast,
            ema_slow_period: bestBacktest.parameters.ema_slow,
            atr_period: bestBacktest.parameters.atr_period,
            confluence_required: bestBacktest.parameters.confluence_threshold,
            win_rate: bestBacktest.win_rate,
            profit_factor: bestBacktest.profit_factor,
            max_drawdown: bestBacktest.max_drawdown,
            total_trades: bestBacktest.total_trades,
            avg_win_pips: bestBacktest.avg_win_pips,
            avg_loss_pips: bestBacktest.avg_loss_pips,
            sharpe_ratio: bestBacktest.sharpe_ratio,
            last_optimized_at: new Date().toISOString()
          })
          .eq('id', currentParams.id);

        if (!updateError) {
          changes.push({
            pair,
            old_profit_factor: currentParams.profit_factor,
            new_profit_factor: bestBacktest.profit_factor,
            old_win_rate: currentParams.win_rate,
            new_win_rate: bestBacktest.win_rate,
            improvement: profitFactorImprovement
          });
          
          totalImprovement += profitFactorImprovement;
          optimizedPairs++;
          
          console.log(`🎯 Optimized ${pair}: Profit Factor ${currentParams.profit_factor.toFixed(2)} → ${bestBacktest.profit_factor.toFixed(2)}`);
        }
      } else {
        console.log(`📊 ${pair} parameters are already optimal (PF: ${currentParams.profit_factor.toFixed(2)}, WR: ${(currentParams.win_rate * 100).toFixed(1)}%)`);
      }
    }

    return {
      optimized_pairs: optimizedPairs,
      total_pairs: pairs.length,
      changes,
      improvement: optimizedPairs > 0 ? totalImprovement / optimizedPairs : 0
    };

  } catch (error) {
    console.error('Error in optimizeParameters:', error);
    return { optimized_pairs: 0, total_pairs: pairs.length, changes: [], improvement: 0 };
  }
}

async function analyzeMarketRegime(supabase: any) {
  try {
    // Analyze market volatility and trends from recent data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentMarketData, error } = await supabase
      .from('centralized_market_state')
      .select('symbol, current_price, price_change_24h, last_update')
      .gte('last_update', sevenDaysAgo);

    if (error) {
      console.error('Error fetching market data for regime analysis:', error);
      return { regime: 'unknown', volatility: 'normal', trend: 'sideways' };
    }

    // Calculate average volatility across major pairs
    const majorPairs = recentMarketData.filter(d => 
      ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD'].includes(d.symbol)
    );

    const avgVolatility = majorPairs.reduce((sum, pair) => 
      sum + Math.abs(pair.price_change_24h || 0), 0
    ) / majorPairs.length;

    // Determine market regime
    let regime = 'normal';
    let volatility = 'normal';
    let trend = 'sideways';

    if (avgVolatility > 1.5) {
      regime = 'high_volatility';
      volatility = 'high';
    } else if (avgVolatility < 0.5) {
      regime = 'low_volatility';
      volatility = 'low';
    }

    // Simple trend analysis (more sophisticated analysis could be added)
    const positiveChanges = majorPairs.filter(p => (p.price_change_24h || 0) > 0).length;
    const negativeChanges = majorPairs.filter(p => (p.price_change_24h || 0) < 0).length;

    if (positiveChanges > negativeChanges * 1.5) {
      trend = 'bullish_usd';
    } else if (negativeChanges > positiveChanges * 1.5) {
      trend = 'bearish_usd';
    }

    return {
      regime,
      volatility,
      trend,
      avg_volatility: avgVolatility,
      analysis_date: new Date().toISOString(),
      pairs_analyzed: majorPairs.length
    };

  } catch (error) {
    console.error('Error in analyzeMarketRegime:', error);
    return { regime: 'unknown', volatility: 'normal', trend: 'sideways' };
  }
}