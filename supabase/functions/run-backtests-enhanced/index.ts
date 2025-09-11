import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BacktestParameters {
  rsiOversoldBuy: number;
  rsiOverboughtSell: number;
  emaShort: number;
  emaLong: number;
  atrMultiplier: number;
  minConfluences: number;
  stopLossPercent: number;
  takeProfitMultipliers: number[];
  tier2ConfidenceThreshold: number;
  tier3QualityThreshold: number;
}

interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  avgWinPips: number;
  avgLossPips: number;
  totalPips: number;
  rewardRiskRatio: number;
  sharpeRatio: number;
}

serve(async (req) => {
  console.log('🎯 Enhanced Backtesting Engine Started for 70%+ Win Rate Optimization');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      pairs, 
      testPeriodStart, 
      testPeriodEnd, 
      parameterGrid 
    } = await req.json();

    console.log(`🔬 Starting grid search backtesting for ${pairs.length} pairs`);
    console.log(`📅 Test period: ${testPeriodStart} to ${testPeriodEnd}`);

    const allResults: any[] = [];

    // Grid search: Test 100+ parameter combinations
    const gridSearchParams = generateParameterGrid();
    
    console.log(`🧪 Testing ${gridSearchParams.length} parameter combinations`);

    for (const pair of pairs) {
      console.log(`📊 Backtesting ${pair}...`);

      // Fetch historical data for the pair
      const { data: historicalData, error } = await supabase
        .from('historical_market_data')
        .select('*')
        .eq('symbol', pair)
        .gte('timestamp', testPeriodStart)
        .lte('timestamp', testPeriodEnd)
        .order('timestamp', { ascending: true });

      if (error || !historicalData || historicalData.length === 0) {
        console.warn(`⚠️ No historical data for ${pair}, skipping`);
        continue;
      }

      console.log(`📈 Processing ${historicalData.length} data points for ${pair}`);

      // Test each parameter combination
      for (let i = 0; i < gridSearchParams.length; i++) {
        const params = gridSearchParams[i];
        
        if (i % 10 === 0) {
          console.log(`⏳ Testing parameter set ${i + 1}/${gridSearchParams.length} for ${pair}`);
        }

        const result = await runBacktest(historicalData, params, pair);
        
        if (result.totalTrades >= 10) { // Minimum trades for statistical significance
          allResults.push({
            pair,
            parameters: params,
            ...result,
            testName: `GridSearch_${pair}_${i}`,
            testPeriodStart,
            testPeriodEnd
          });
        }
      }
    }

    // Find optimal parameters (70%+ win rate, >1.5 profit factor, <20% drawdown)
    const optimalResults = allResults.filter(r => 
      r.winRate >= 70 && 
      r.profitFactor >= 1.5 && 
      r.maxDrawdown <= 20 &&
      r.totalTrades >= 50
    );

    console.log(`🎯 Found ${optimalResults.length} parameter sets meeting 70%+ win rate criteria`);

    // Store all results in database
    if (allResults.length > 0) {
      const { error: insertError } = await supabase
        .from('backtesting_results')
        .insert(allResults);

      if (insertError) {
        console.error('❌ Error storing backtesting results:', insertError);
      }
    }

    // Store optimal parameters for each pair
    const pairOptimalParams = new Map();
    
    for (const result of optimalResults) {
      const key = result.pair;
      if (!pairOptimalParams.has(key) || 
          pairOptimalParams.get(key).winRate < result.winRate) {
        pairOptimalParams.set(key, result);
      }
    }

    // Update optimal_trading_parameters table
    for (const [pair, optimalResult] of pairOptimalParams) {
      const { error: updateError } = await supabase
        .from('optimal_trading_parameters')
        .upsert({
          pair: pair,
          timeframe: '5M',
          tier_1_params: {
            rsiOversoldBuy: optimalResult.parameters.rsiOversoldBuy,
            rsiOverboughtSell: optimalResult.parameters.rsiOverboughtSell,
            emaShort: optimalResult.parameters.emaShort,
            emaLong: optimalResult.parameters.emaLong,
            minConfluences: optimalResult.parameters.minConfluences,
            atrMultiplier: optimalResult.parameters.atrMultiplier
          },
          tier_2_params: {
            confidenceThreshold: optimalResult.parameters.tier2ConfidenceThreshold,
            promptVariation: 'ultra_selective_70_percent'
          },
          tier_3_params: {
            qualityThreshold: optimalResult.parameters.tier3QualityThreshold,
            precisionMode: true
          },
          win_rate_achieved: optimalResult.winRate,
          profit_factor_achieved: optimalResult.profitFactor,
          max_drawdown_achieved: optimalResult.maxDrawdown,
          total_trades_tested: optimalResult.totalTrades,
          backtesting_period_start: testPeriodStart,
          backtesting_period_end: testPeriodEnd,
          active: true
        }, { onConflict: 'pair,timeframe,active' });

      if (updateError) {
        console.error(`❌ Error updating optimal parameters for ${pair}:`, updateError);
      }
    }

    console.log(`✅ Backtesting complete. Optimal parameters stored for ${pairOptimalParams.size} pairs`);

    return new Response(
      JSON.stringify({
        success: true,
        totalParameterCombinations: gridSearchParams.length,
        totalResults: allResults.length,
        optimalResults: optimalResults.length,
        pairsOptimized: pairOptimalParams.size,
        bestPerformers: Array.from(pairOptimalParams.entries()).map(([pair, result]) => ({
          pair,
          winRate: result.winRate,
          profitFactor: result.profitFactor,
          maxDrawdown: result.maxDrawdown,
          totalTrades: result.totalTrades
        })).slice(0, 10)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Enhanced backtesting error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Generate parameter grid for testing 100+ combinations
function generateParameterGrid(): BacktestParameters[] {
  const grid: BacktestParameters[] = [];
  
  // RSI levels (ultra-selective variants)
  const rsiOversoldLevels = [20, 22, 25, 28];
  const rsiOverboughtLevels = [72, 75, 78, 80];
  
  // EMA periods
  const emaShortPeriods = [20, 21, 25];
  const emaLongPeriods = [50, 55, 60];
  
  // ATR multipliers
  const atrMultipliers = [1.5, 2.0, 2.5, 3.0];
  
  // Confluence requirements
  const confluenceRequirements = [3, 4, 5];
  
  // Tier 2/3 thresholds
  const tier2Thresholds = [80, 85, 90];
  const tier3Thresholds = [85, 90, 95];

  for (const rsiOversold of rsiOversoldLevels) {
    for (const rsiOverbought of rsiOverboughtLevels) {
      for (const emaShort of emaShortPeriods) {
        for (const emaLong of emaLongPeriods) {
          for (const atrMult of atrMultipliers) {
            for (const minConf of confluenceRequirements) {
              for (const tier2 of tier2Thresholds) {
                for (const tier3 of tier3Thresholds) {
                  grid.push({
                    rsiOversoldBuy: rsiOversold,
                    rsiOverboughtSell: rsiOverbought,
                    emaShort: emaShort,
                    emaLong: emaLong,
                    atrMultiplier: atrMult,
                    minConfluences: minConf,
                    stopLossPercent: 1.8,
                    takeProfitMultipliers: [1.5, 2.5, 4.0],
                    tier2ConfidenceThreshold: tier2,
                    tier3QualityThreshold: tier3
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return grid;
}

// Run backtest with specific parameters
async function runBacktest(
  historicalData: any[], 
  params: BacktestParameters, 
  pair: string
): Promise<BacktestResult> {
  
  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalPips = 0;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let peak = 0;
  const tradePips: number[] = [];

  // Simulate trading with the parameters
  for (let i = 50; i < historicalData.length - 10; i++) { // Need history for indicators
    const currentBar = historicalData[i];
    const prices = historicalData.slice(i - 50, i).map((d: any) => d.close_price);
    
    // Calculate indicators
    const rsi = calculateRSI(prices);
    const emaShort = calculateEMA(prices, params.emaShort);
    const emaLong = calculateEMA(prices, params.emaLong);
    const atr = calculateATR(historicalData.slice(i - 14, i));
    
    // Check for signal conditions
    let signalType: 'BUY' | 'SELL' | null = null;
    let confluences = 0;
    
    // RSI condition
    if (rsi < params.rsiOversoldBuy) {
      confluences++;
    } else if (rsi > params.rsiOverboughtSell) {
      confluences++;
    }
    
    // EMA condition  
    if (emaShort > emaLong) {
      confluences++;
      if (rsi < params.rsiOversoldBuy) signalType = 'BUY';
    } else if (emaShort < emaLong) {
      confluences++;
      if (rsi > params.rsiOverboughtSell) signalType = 'SELL';
    }
    
    // ATR condition
    if (atr > 0.0001) {
      confluences++;
    }
    
    // Check if minimum confluences met
    if (confluences >= params.minConfluences && signalType) {
      totalTrades++;
      
      const entryPrice = currentBar.close_price;
      const stopLoss = signalType === 'BUY' 
        ? entryPrice * (1 - params.stopLossPercent / 100)
        : entryPrice * (1 + params.stopLossPercent / 100);
      
      const takeProfit1 = signalType === 'BUY'
        ? entryPrice + (entryPrice - stopLoss) * params.takeProfitMultipliers[0]
        : entryPrice - (stopLoss - entryPrice) * params.takeProfitMultipliers[0];
      
      // Simulate trade outcome over next 10 bars
      let tradeResult = 0;
      for (let j = i + 1; j < Math.min(i + 11, historicalData.length); j++) {
        const futureBar = historicalData[j];
        
        if (signalType === 'BUY') {
          if (futureBar.low_price <= stopLoss) {
            tradeResult = -Math.abs(entryPrice - stopLoss);
            break;
          } else if (futureBar.high_price >= takeProfit1) {
            tradeResult = Math.abs(takeProfit1 - entryPrice);
            break;
          }
        } else {
          if (futureBar.high_price >= stopLoss) {
            tradeResult = -Math.abs(stopLoss - entryPrice);
            break;
          } else if (futureBar.low_price <= takeProfit1) {
            tradeResult = Math.abs(entryPrice - takeProfit1);
            break;
          }
        }
      }
      
      // Calculate pips
      const isJPY = pair.includes('JPY');
      const pipMultiplier = isJPY ? 100 : 10000;
      const pipResult = tradeResult * pipMultiplier;
      
      tradePips.push(pipResult);
      totalPips += pipResult;
      
      if (pipResult > 0) {
        winningTrades++;
      } else {
        losingTrades++;
      }
      
      // Track drawdown
      if (totalPips > peak) {
        peak = totalPips;
        currentDrawdown = 0;
      } else {
        currentDrawdown = peak - totalPips;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
        }
      }
    }
  }

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const winningPips = tradePips.filter(p => p > 0);
  const losingPips = tradePips.filter(p => p < 0);
  
  const avgWinPips = winningPips.length > 0 ? winningPips.reduce((a, b) => a + b, 0) / winningPips.length : 0;
  const avgLossPips = losingPips.length > 0 ? Math.abs(losingPips.reduce((a, b) => a + b, 0) / losingPips.length) : 0;
  
  const profitFactor = avgLossPips > 0 ? (avgWinPips * winningTrades) / (avgLossPips * losingTrades) : 0;
  const rewardRiskRatio = avgLossPips > 0 ? avgWinPips / avgLossPips : 0;
  
  // Simple Sharpe ratio calculation
  const avgReturn = tradePips.length > 0 ? tradePips.reduce((a, b) => a + b, 0) / tradePips.length : 0;
  const variance = tradePips.length > 0 ? tradePips.reduce((sum, pip) => sum + Math.pow(pip - avgReturn, 2), 0) / tradePips.length : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    maxDrawdown: peak > 0 ? (maxDrawdown / peak) * 100 : 0,
    avgWinPips,
    avgLossPips,
    totalPips,
    rewardRiskRatio,
    sharpeRatio
  };
}

// Simple technical indicator calculations
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateATR(bars: any[], period: number = 14): number {
  if (bars.length < 2) return 0;
  
  let trSum = 0;
  for (let i = 1; i < Math.min(bars.length, period + 1); i++) {
    const tr = Math.max(
      bars[i].high_price - bars[i].low_price,
      Math.abs(bars[i].high_price - bars[i - 1].close_price),
      Math.abs(bars[i].low_price - bars[i - 1].close_price)
    );
    trSum += tr;
  }
  
  return trSum / Math.min(bars.length - 1, period);
}