import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced interfaces with optimal parameters support
interface MarketData {
  symbol: string;
  current_price: number;
  bid?: number;
  ask?: number;
  last_update: string;
  price_change_24h?: number;
  volume_24h?: number;
  source?: string;
  is_market_open?: boolean;
}

interface OptimalParameters {
  rsi_oversold: number;
  rsi_overbought: number;
  ema_fast_period: number;
  ema_slow_period: number;
  atr_period: number;
  confluence_required: number;
  min_confluence_score: number;
  win_rate?: number;
  profit_factor?: number;
}

interface ProfessionalSignalAnalysis {
  symbol: string;
  shouldSignal: boolean;
  signalType: 'BUY' | 'SELL';
  confidence: number;
  quality: number;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  analysis: string;
  confluenceFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  sessionOptimal: boolean;
  marketConditions: any;
  optimalParametersUsed?: OptimalParameters;
}

interface SignalData {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  stop_loss: number;
  take_profits: number[];
  confidence: number;
  analysis_text: string;
  timestamp: string;
  status: string;
  is_centralized: boolean;
  user_id: null;
  metadata?: any;
}

interface PricePoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Configuration for winning signals - Enhanced thresholds and 20+ pip enforcement
const THRESHOLD_CONFIGS = {
  EXTREME: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 85,        // Higher quality bar
    tier1RequiredConfluences: 5,   // 5+ technical confirmations  
    tier2EscalationQuality: 90,    // Elite quality bar
    tier2EscalationConfidence: 85, // 85%+ confidence required
    tier3QualityThreshold: 95,     // Ultra-institutional quality
    tier3ConfidenceThreshold: 90,  // 90%+ confidence for signal publication
    finalQualityThreshold: 95,     // Final gate quality threshold
    finalConfidenceThreshold: 90,  // Final gate confidence threshold
    maxSignalsPerRun: 2,           // Premium precision - max 2 signals per 5min
    rsiOversoldBuy: 15,            // Extreme RSI levels
    rsiOverboughtSell: 85,         // Extreme RSI levels
    minRewardRisk: 3.0,            // Minimum 3:1 reward/risk ratio
    atrMinimumMultiplier: 2.0,     // Higher ATR for sufficient volatility
    economicCalendarBuffer: 90,    // Avoid signals 90min before/after high impact news
    sessionRestriction: true,      // Only London/NY overlap periods
    correlationCheck: true,        // Avoid highly correlated pairs
    minimumGapHours: 48,          // Minimum 48-hour gap between signals on same pair
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    fallbackThreshold: 75,        // Fallback if no signals generated
    minFirstTPPips: 25,           // Minimum 25 pips for first TP
  },
  ULTRA: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 80,        // High quality bar
    tier1RequiredConfluences: 4,   // 4+ technical confirmations with fallback
    tier2EscalationQuality: 85,    // High quality bar
    tier2EscalationConfidence: 80, // 80%+ confidence required
    tier3QualityThreshold: 90,     // Institutional quality
    tier3ConfidenceThreshold: 85,  // 85%+ confidence for signal publication
    finalQualityThreshold: 90,     // Final gate quality threshold
    finalConfidenceThreshold: 85,  // Final gate confidence threshold
    maxSignalsPerRun: 3,           // Quality precision - max 3 signals per 5min
    rsiOversoldBuy: 20,            // Selective RSI levels
    rsiOverboughtSell: 80,
    minRewardRisk: 2.5,            // Minimum 2.5:1 reward/risk ratio
    atrMinimumMultiplier: 1.5,     // Higher ATR for sufficient volatility
    economicCalendarBuffer: 60,    // Avoid signals 60min before/after high impact news
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    fallbackThreshold: 70,        // Fallback if no signals generated
    minFirstTPPips: 22,           // Minimum 22 pips for first TP
  },
  HIGH: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 75,        // Raised for better win rates
    tier1RequiredConfluences: 4,   // 4+ technical confirmations
    tier2EscalationQuality: 80,    // Good quality bar
    tier2EscalationConfidence: 75, // 75%+ confidence required
    tier3QualityThreshold: 85,     // Strong quality
    tier3ConfidenceThreshold: 80,  // 80%+ confidence for signal publication
    finalQualityThreshold: 85,     // Final gate quality threshold
    finalConfidenceThreshold: 80,  // Final gate confidence threshold
    maxSignalsPerRun: 5,           // Balanced quantity - max 5 signals per 5min
    rsiOversoldBuy: 25,            // Stricter RSI levels
    rsiOverboughtSell: 75,
    minRewardRisk: 2.0,            // Minimum 2:1 reward/risk ratio
    atrMinimumMultiplier: 1.2,     // Higher ATR requirement
    economicCalendarBuffer: 45,    // Avoid signals 45min before/after high impact news
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    fallbackThreshold: 65,        // Fallback if no signals generated
    minFirstTPPips: 20,           // Minimum 20 pips for first TP
  },
  MEDIUM: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 70,        // Moderate threshold
    tier1RequiredConfluences: 3,   // 3+ technical confirmations
    tier2EscalationQuality: 75,    // Moderate quality bar
    tier2EscalationConfidence: 70, // 70%+ confidence required
    tier3QualityThreshold: 80,     // Good quality threshold
    tier3ConfidenceThreshold: 75,  // 75%+ confidence for signal publication
    finalQualityThreshold: 80,     // Final gate quality threshold
    finalConfidenceThreshold: 75,  // Final gate confidence threshold
    maxSignalsPerRun: 5,           // Balanced volume - max 5 signals per 5min
    rsiOversoldBuy: 30,            // Moderate RSI levels
    rsiOverboughtSell: 70,
    minRewardRisk: 1.8,            // Minimum 1.8:1 reward/risk ratio
    atrMinimumMultiplier: 1.0,     // Standard ATR requirement
    economicCalendarBuffer: 45,    // Avoid signals 45min before/after high impact news
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    minFirstTPPips: 20,           // Minimum 20 pips for first TP
  },
  LOW: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 60,        // Lower threshold
    tier1RequiredConfluences: 3,   // 3+ technical confirmations
    tier2EscalationQuality: 65,    // Lower quality bar
    tier2EscalationConfidence: 60, // 60%+ confidence required
    tier3QualityThreshold: 70,     // Standard quality threshold
    tier3ConfidenceThreshold: 65,  // 65%+ confidence for signal publication
    finalQualityThreshold: 70,     // Final gate quality threshold
    finalConfidenceThreshold: 65,  // Final gate confidence threshold
    maxSignalsPerRun: 8,           // Higher volume - max 8 signals per 5min
    rsiOversoldBuy: 35,            // Standard RSI levels
    rsiOverboughtSell: 65,
    minRewardRisk: 1.5,            // Minimum 1.5:1 reward/risk ratio
    atrMinimumMultiplier: 0.8,     // Lower ATR requirement
    economicCalendarBuffer: 30,    // Avoid signals 30min before/after high impact news
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    minFirstTPPips: 20,           // Minimum 20 pips for first TP
  }
} as const;

// Get dynamic configuration based on admin settings
async function getSignalConfig(supabase: any) {
  try {
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('signal_threshold_level')
      .eq('singleton', true)
      .single();
    
    if (error) {
      console.warn('⚠️ Could not fetch signal threshold settings, using HIGH default:', error);
      return THRESHOLD_CONFIGS.HIGH;
    }
    
    const level = settings?.signal_threshold_level || 'HIGH';
    console.log(`🎯 Using ${level} threshold configuration`);
    return THRESHOLD_CONFIGS[level as keyof typeof THRESHOLD_CONFIGS] || THRESHOLD_CONFIGS.HIGH;
  } catch (error) {
    console.warn('⚠️ Error fetching signal threshold settings, using HIGH default:', error);
    return THRESHOLD_CONFIGS.HIGH;
  }
}

serve(async (req) => {
  console.log(`🚀 ENHANCED Signal Generation for WINNING TRADES - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get dynamic configuration from admin settings
    const CONFIG = await getSignalConfig(supabase);

    // Parse request parameters
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) requestBody = JSON.parse(bodyText);
    } catch (e) {
      console.log('📝 Using default parameters');
    }

    const { 
      force = false,
      debug = false,
      maxSignals = CONFIG.maxSignalsPerRun,
      fullAnalysis = true
    } = requestBody;

    console.log(`🎯 WINNING MODE - Force: ${force}, Debug: ${debug}, Max Signals: ${maxSignals}`);
    
    // Get current market session for optimal parameters
    const currentSession = getCurrentSessionText();
    console.log(`📍 Current trading session: ${currentSession}`);

    // Get market data
    console.log('📊 Fetching centralized market data...');
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false });

    if (marketError || !marketData || marketData.length === 0) {
      console.log('⚠️ No market data available');
      return new Response(JSON.stringify({
        error: 'No market data available',
        stats: { signalsGenerated: 0, reason: 'no_market_data' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log(`📈 Loaded market data for ${marketData.length} pairs`);

    // Check existing signals with bias monitoring (informational only)
    const { data: existingSignals } = await supabase
      .from('trading_signals')
      .select('symbol, type, confidence, created_at')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    // Market-driven signal analysis (no artificial bias enforcement)
    const biasCheck = await monitorSignalBias(supabase, existingSignals || []);
    console.log(`📊 Current distribution: BUY: ${biasCheck.buy_percentage}%, SELL: ${biasCheck.sell_percentage}%`);
    console.log(`🎯 AUTHENTIC APPROACH: Signals driven by market conditions, not artificial balance`);
    
    // Log but don't restrict based on bias - let market conditions drive direction
    if (biasCheck.bias_detected) {
      console.log(`📊 Distribution note: ${biasCheck.message}`);
      console.log(`✅ Continuing with market-driven analysis regardless of historical distribution`);
    }

    const currentSignalCount = existingSignals?.length || 0;
    const maxTotalSignals = marketData.length; // Cap matches available pairs (27)
    const maxNewSignals = Math.min(maxSignals, maxTotalSignals - currentSignalCount);

    console.log(`📋 Signal Status - Current: ${currentSignalCount}/${maxTotalSignals}, Can generate: ${maxNewSignals}`);

    if (maxNewSignals <= 0 && !force) {
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'signal_limit_reached',
        stats: { signalsGenerated: 0, currentSignals: currentSignalCount }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get historical data for analysis
    const historicalData = await getEnhancedHistoricalData(supabase, marketData.map(d => d.symbol));

    // Enhanced 3-Tier Analysis Pipeline for Winning Signals
    const startTime = Date.now();
    const generatedSignals: SignalData[] = [];
    const analysisStats = {
      tier1Analyzed: 0,
      tier1Passed: 0,
      tier2Analyzed: 0,
      tier2Passed: 0,
      tier3Analyzed: 0,
      tier3Passed: 0,
      totalCost: 0,
      totalTokens: 0
    };

    let tier1Threshold = CONFIG.tier1PassThreshold;
    console.log(`⚙️ Tier 1 pass threshold: ${tier1Threshold} (Level: ${CONFIG.level || 'HIGH'})`);
    
    // Prioritize major pairs but analyze all available
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
    const availablePairs = marketData
      .filter(d => d.symbol && d.current_price > 0)
      .filter(d => !existingSignals?.some(s => s.symbol === d.symbol));
    
    // Filter out symbols with insufficient historical data (need >= 50 points)
    const pairsWithHistory = availablePairs.filter(d => {
      const hist = historicalData.get(d.symbol) || [];
      if (hist.length < 50) {
        console.log(`⚠️ Skipping ${d.symbol}: insufficient history (${hist.length})`);
        return false;
      }
      return true;
    });
    
    const selectedPairs = pairsWithHistory.slice(0, marketData.length);
    console.log(`🔥 WINNING SIGNAL ANALYSIS: Analyzing ${selectedPairs.length} pairs with enhanced system`);

    // Enhanced 3-Tier Analysis Pipeline with Fallback Mechanism
    let fallbackActivated = false;
    
    for (let i = 0; i < selectedPairs.length && generatedSignals.length < maxNewSignals; i++) {
      const pair = selectedPairs[i];
      
      try {
        console.log(`🎯 [${i + 1}/${selectedPairs.length}] Professional analysis: ${pair.symbol}`);
        
        // Get optimal parameters for this pair if available
        const optimalParams = await getOptimalParametersForPair(supabase, pair.symbol, currentSession);
        console.log(`🎯 Using ${optimalParams ? 'optimal' : 'default'} parameters for ${pair.symbol}`);
        
        // Tier 1: Enhanced technical analysis with winning signal focus
        const tier1Analysis = await performTier1Analysis(pair, historicalData, optimalParams, CONFIG);
        analysisStats.tier1Analyzed++;
        
        console.log(`🔍 TIER 1: ${pair.symbol} - Score: ${tier1Analysis.confluenceScore}/100 (Pass: ${tier1Threshold}+)`);
        
        // Check if we need fallback threshold (no signals generated yet and halfway through pairs)
        if (!fallbackActivated && generatedSignals.length === 0 && i > selectedPairs.length / 2 && CONFIG.fallbackThreshold) {
          tier1Threshold = CONFIG.fallbackThreshold;
          fallbackActivated = true;
          console.log(`🔄 FALLBACK ACTIVATED: Lowering threshold to ${tier1Threshold} to ensure signal generation`);
        }
        
        if (tier1Analysis.confluenceScore < tier1Threshold) {
          const details = tier1Analysis.details;
          console.log(`❌ TIER 1: ${pair.symbol} failed pre-screening (${tier1Analysis.confluenceScore}/100)`);
          console.log(`   📊 Diagnostics: RSI=${details.rsi?.toFixed(2)}, EMA_fast=${details.ema_fast?.toFixed(5)}, EMA_slow=${details.ema_slow?.toFixed(5)}`);
          console.log(`   📈 ATR=${details.atr?.toFixed(6)}, pip_size=${details.pip_size}, price_Δ=${details.price_delta?.toFixed(6)}`);
          console.log(`   💫 Session=${details.session}, change%=${(details.price_change_ratio*100)?.toFixed(3)}%`);
          if (details.fail_reasons?.length > 0) {
            console.log(`   ❌ Fail reasons: ${details.fail_reasons.join(', ')}`);
          }
          continue;
        }
        
        analysisStats.tier1Passed++;

        // Tier 2: AI-powered analysis with bias elimination and 20+ pip enforcement
        let tier2Analysis: ProfessionalSignalAnalysis | null = null;
        try {
          tier2Analysis = await performTier2Analysis(pair, historicalData, tier1Analysis, openAIApiKey, optimalParams, CONFIG);
          
          if (!tier2Analysis.shouldSignal) {
            console.log(`❌ TIER 2: ${pair.symbol} rejected - confidence ${tier2Analysis.confidence}% < ${CONFIG.tier2EscalationConfidence}%`);
          } else {
            analysisStats.tier2Passed++;
          }
        } catch (error) {
          console.error(`❌ TIER 2: ${pair.symbol} analysis failed:`, error);
          continue;
        } finally {
          analysisStats.tier2Analyzed++;
        }

        if (!tier2Analysis.shouldSignal) {
          continue;
        }

        // Tier 3: Premium analysis with institutional-grade criteria
        let finalAnalysis: ProfessionalSignalAnalysis;
        try {
          finalAnalysis = await performTier3Analysis(pair, historicalData, tier2Analysis, openAIApiKey, optimalParams, CONFIG);
          
          if (!finalAnalysis.shouldSignal) {
            console.log(`❌ TIER 3: ${pair.symbol} rejected - confidence ${finalAnalysis.confidence}% < ${CONFIG.tier3ConfidenceThreshold}%`);
            continue;
          }
          
          analysisStats.tier3Passed++;
        } catch (error) {
          console.error(`❌ TIER 3: ${pair.symbol} analysis failed:`, error);
          continue;
        } finally {
          analysisStats.tier3Analyzed++;
        }

        // FINAL QUALITY ASSURANCE - Enforce 20+ pip requirement
        const pipSize = getPipSize(finalAnalysis.symbol);
        const firstTPDistance = Math.abs(finalAnalysis.takeProfits[0] - finalAnalysis.entryPrice) / pipSize;
        
        if (firstTPDistance < CONFIG.minFirstTPPips) {
          console.log(`❌ FINAL GATE: ${finalAnalysis.symbol} rejected - first TP only ${firstTPDistance.toFixed(1)} pips (minimum ${CONFIG.minFirstTPPips} required)`);
          continue;
        }

        console.log(`✅ FINAL GATES: ${finalAnalysis.symbol} passed all quality thresholds`);

        // Create the signal data
        const signalData: SignalData = {
          symbol: finalAnalysis.symbol,
          type: finalAnalysis.signalType,
          price: finalAnalysis.entryPrice,
          stop_loss: finalAnalysis.stopLoss,
          take_profits: finalAnalysis.takeProfits,
          confidence: finalAnalysis.confidence,
          analysis_text: finalAnalysis.analysis,
          timestamp: new Date().toISOString(),
          status: 'active',
          is_centralized: true,
          user_id: null,
          metadata: {
            tier1_score: tier1Analysis.confluenceScore,
            tier2_quality: tier2Analysis.quality,
            tier3_quality: finalAnalysis.quality,
            session: currentSession,
            risk_level: finalAnalysis.riskLevel,
            confluence_factors: finalAnalysis.confluenceFactors
          }
        };

        // Insert the signal into the database
        const { data: insertedSignal, error: insertError } = await supabase
          .from('trading_signals')
          .insert([signalData])
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Error inserting signal for ${finalAnalysis.symbol}:`, insertError);
          continue;
        }

        console.log(`✅ Generated signal for ${finalAnalysis.symbol}: ${finalAnalysis.signalType} @ ${finalAnalysis.entryPrice}`);
        generatedSignals.push(signalData);

      } catch (error) {
        console.error(`❌ Error analyzing ${pair.symbol}:`, error);
        continue;
      }
    }

    const executionTime = Date.now() - startTime;
    
    console.log(`✅ ENHANCED GENERATION COMPLETE:`);
    console.log(`   📊 Signals Generated: ${generatedSignals.length}/${maxNewSignals}`);
    console.log(`   🎯 Tier 1: ${analysisStats.tier1Passed}/${analysisStats.tier1Analyzed} passed`);
    console.log(`   💰 Tier 2: ${analysisStats.tier2Passed}/${analysisStats.tier2Analyzed} passed`);
    console.log(`   💎 Tier 3: ${analysisStats.tier3Passed}/${analysisStats.tier3Analyzed} passed`);
    console.log(`   ⏱️ Execution Time: ${executionTime}ms`);
    console.log(`   💵 Total Cost: $${analysisStats.totalCost.toFixed(4)}`);

    return new Response(JSON.stringify({
      status: 'success',
      signalsGenerated: generatedSignals.length,
      signals: generatedSignals.map(s => ({
        symbol: s.symbol,
        type: s.type,
        confidence: s.confidence,
        entryPrice: s.price,
        firstTPPips: Math.abs(s.take_profits[0] - s.price) / getPipSize(s.symbol)
      })),
      stats: {
        totalAnalyzed: analysisStats.tier1Analyzed,
        tier1Passed: analysisStats.tier1Passed,
        tier2Passed: analysisStats.tier2Passed,
        tier3Passed: analysisStats.tier3Passed,
        executionTimeMs: executionTime,
        totalCost: analysisStats.totalCost,
        fallbackActivated
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Enhanced signal generation error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Session helper functions
function getCurrentSessionText(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 21 || utcHour < 9) return 'Asian';
  if (utcHour >= 9 && utcHour < 17) return 'London';
  return 'New York';
}

function isOptimalSession(session: string): boolean {
  // London and NY sessions generally have higher volume
  return session === 'London' || session === 'New York';
}

// Enhanced historical data fetching
async function getEnhancedHistoricalData(supabase: any, symbols: string[]) {
  console.log(`🔍 Fetching historical data per symbol (${symbols.length} symbols) from live_price_history...`);
  
  const historicalData = new Map();
  const batchSize = 8;
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (symbol) => {
      try {
        const { data, error } = await supabase
          .from('live_price_history')
          .select('symbol, timestamp, price')
          .eq('symbol', symbol)
          .order('timestamp', { ascending: false })
          .limit(200);
        
        if (error) {
          console.error(`❌ Historical data fetch error for ${symbol}:`, error);
          return;
        }
        
        if (!data || data.length === 0) {
          console.log(`⚠️ No historical data for ${symbol}`);
          return;
        }
        
        // Transform to required format and sort chronologically
        const symbolData = data
          .reverse() // Get chronological order for technical analysis
          .map(d => ({
            symbol: d.symbol,
            timestamp: d.timestamp,
            close_price: d.price,
            high_price: d.price, // Use price for all OHLC since it's tick data
            low_price: d.price,
            open_price: d.price
          }));
        
        console.log(`📊 ${symbol}: ${symbolData.length} data points`);
        historicalData.set(symbol, symbolData);
        
      } catch (err) {
        console.error(`❌ Failed to fetch data for ${symbol}:`, err);
      }
    });
    
    // Wait for current batch before starting next
    await Promise.all(batchPromises);
  }
  
  console.log(`✅ Retrieved historical data for ${historicalData.size}/${symbols.length} symbols`);
  return historicalData;
}

// Get optimal parameters for a pair
async function getOptimalParametersForPair(supabase: any, symbol: string, session: string): Promise<OptimalParameters | null> {
  try {
    const { data, error } = await supabase
      .from('optimal_trading_parameters')
      .select('*')
      .eq('symbol', symbol)
      .eq('market_session', session)
      .order('last_optimized_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const params = data[0];
    return {
      rsi_oversold: params.rsi_oversold || 25,
      rsi_overbought: params.rsi_overbought || 75,
      ema_fast_period: params.ema_fast_period || 21,
      ema_slow_period: params.ema_slow_period || 55,
      atr_period: params.atr_period || 14,
      confluence_required: params.confluence_required || 4,
      min_confluence_score: params.min_confluence_score || 75,
      win_rate: params.win_rate,
      profit_factor: params.profit_factor
    };
  } catch (error) {
    console.error(`Error fetching optimal parameters for ${symbol}:`, error);
    return null;
  }
}

// Tier 1: Enhanced technical analysis with winning signal focus
async function performTier1Analysis(
  marketData: MarketData, 
  historicalData: Map<string, any[]>, 
  optimalParams?: OptimalParameters,
  config?: any
) {
  const symbol = marketData.symbol;
  const hist = historicalData.get(symbol) || [];
  
  if (hist.length < 50) {
    return {
      confluenceScore: 0,
      signalDirection: null,
      details: { error: `Insufficient historical data for ${symbol}: ${hist.length}` }
    };
  }
  
  const prices = hist.map(h => h.close_price);
  const recentPrices = prices.slice(-50);
  const current = marketData.current_price;
  
  // Use winning parameters with stricter thresholds
  const params = optimalParams || {
    rsi_oversold: 25,     // Stricter oversold
    rsi_overbought: 75,   // Stricter overbought
    ema_fast_period: 21,
    ema_slow_period: 55,
    atr_period: 14,
    confluence_required: 4,  // More confluences required
    min_confluence_score: 75 // Higher quality bar
  };
  
  // Calculate enhanced technical indicators
  const rsi = calculateRSI(recentPrices, 14);
  const emaFast = calculateEMA(recentPrices, params.ema_fast_period);
  const emaSlow = calculateEMA(recentPrices, params.ema_slow_period);
  const atr = calculateATR(hist.slice(-20));
  
  // Calculate volumes for confirmation
  const recentVolumes = hist.slice(-10).map(h => h.volume || 0);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const currentVolume = hist[hist.length - 1]?.volume || 0;
  
  // Price change analysis
  const priceChange = current - hist[hist.length - 1].close_price;
  const priceChangeRatio = Math.abs(priceChange) / hist[hist.length - 1].close_price;
  
  // Get pip size for this pair
  const pipSize = getPipSize(symbol);
  
  // Get current session
  const session = getCurrentSessionText();
  
  let confluenceScore = 0;
  let signalDirection: 'BUY' | 'SELL' | null = null;
  const failReasons: string[] = [];
  
  // WINNING CONFLUENCE ANALYSIS - STRICTER CRITERIA
  
  // 1. RSI Analysis - More selective thresholds
  if (rsi < params.rsi_oversold) {
    confluenceScore += 30; // Higher weight for clear oversold
    if (!signalDirection) signalDirection = 'BUY';
  } else if (rsi > params.rsi_overbought) {
    confluenceScore += 30; // Higher weight for clear overbought
    if (!signalDirection) signalDirection = 'SELL';
  } else {
    failReasons.push(`RSI not extreme (${rsi.toFixed(1)} not < ${params.rsi_oversold} or > ${params.rsi_overbought})`);
  }
  
  // 2. EMA Trend Analysis - Clearer separation required
  const emaSeparation = Math.abs(emaFast - emaSlow) / emaSlow;
  if (emaSeparation > 0.005) { // 0.5% minimum separation (stricter)
    confluenceScore += 25;
    if (emaFast > emaSlow && rsi < params.rsi_oversold) {
      signalDirection = 'BUY';
    } else if (emaFast < emaSlow && rsi > params.rsi_overbought) {
      signalDirection = 'SELL';
    }
  } else {
    failReasons.push(`Weak EMA trend (${(emaSeparation*100).toFixed(3)}% separation)`);
  }
  
  // 3. Volume Confirmation - Require above-average volume
  if (currentVolume > avgVolume * 1.2) {
    confluenceScore += 15;
  } else {
    failReasons.push(`Low volume confirmation`);
  }
  
  // 4. ATR Volatility - Ensure sufficient movement potential
  const atrThreshold = symbol.includes('JPY') ? 0.05 : 0.0008;
  if (atr > atrThreshold) {
    confluenceScore += 15;
  } else {
    failReasons.push(`Insufficient volatility (ATR=${atr.toFixed(6)})`);
  }
  
  // 5. Momentum Confirmation - Stronger momentum required
  if (priceChangeRatio > 0.008) { // 0.8% minimum momentum (stricter)
    confluenceScore += 10;
  } else {
    failReasons.push(`Weak momentum (${(priceChangeRatio*100).toFixed(3)}%)`);
  }
  
  // 6. Session Timing - Only trade optimal sessions
  if (isOptimalSession(session)) {
    confluenceScore += 10;
  } else {
    failReasons.push(`Suboptimal session (${session})`);
  }
  
  // 7. Support/Resistance Analysis
  const supportResistance = findSupportResistanceLevels(recentPrices, current);
  if (isNearSupportResistance(current, supportResistance, pipSize)) {
    confluenceScore += 5;
  }
  
  // ELIMINATE BIAS: Only signal when ALL technical conditions align
  if (signalDirection && confluenceScore < 85) {
    signalDirection = null; // Reset if not strong enough
    failReasons.push(`Insufficient confluence score (${confluenceScore}/100)`);
  }
  
  return {
    confluenceScore,
    signalDirection,
    details: {
      rsi,
      ema_fast: emaFast,
      ema_slow: emaSlow,
      atr,
      pip_size: pipSize,
      price_delta: priceChange,
      price_change_ratio: priceChangeRatio,
      session,
      fail_reasons: failReasons,
      volume_ratio: currentVolume / (avgVolume || 1),
      ema_separation: emaSeparation
    }
  };
}

// Tier 2: AI-powered analysis with bias elimination and 20+ pip enforcement
async function performTier2Analysis(
  marketData: MarketData, 
  historicalData: Map<string, any[]>, 
  tier1Analysis: any, 
  openAIApiKey: string,
  optimalParams?: OptimalParameters,
  config?: any
): Promise<ProfessionalSignalAnalysis> {
  const symbol = marketData.symbol;
  const hist = historicalData.get(symbol) || [];
  const prices = hist.map(h => h.close_price);
  const current = marketData.current_price;
  
  // Calculate comprehensive technical indicators
  const rsi = calculateRSI(prices.slice(-50), 14);
  const emaFast = calculateEMA(prices.slice(-50), 21);
  const emaSlow = calculateEMA(prices.slice(-50), 55);
  const atr = calculateATR(hist.slice(-20));
  const bb = calculateBollingerBands(prices.slice(-20), 20, 2);
  
  // Market regime detection
  const trendStrength = calculateTrendStrength(prices.slice(-100));
  const volatilityRegime = atr > getPipSize(symbol) * 30 ? 'high' : 'normal';
  const marketRegime = trendStrength > 0.6 ? 'trending' : 'ranging';
  
  // Prepare UNBIASED market context for AI
  const marketContext = {
    symbol,
    currentPrice: current,
    rsi: rsi.toFixed(2),
    emaFast: emaFast.toFixed(5),
    emaSlow: emaSlow.toFixed(5),
    emaTrend: emaFast > emaSlow ? 'bullish' : 'bearish',
    atr: atr.toFixed(6),
    bbPosition: current > bb.upper ? 'above_upper' : current < bb.lower ? 'below_lower' : 'middle',
    trendStrength: trendStrength.toFixed(3),
    marketRegime,
    volatilityRegime,
    session: getCurrentSessionText(),
    tier1Score: tier1Analysis.confluenceScore
  };

  // UNBIASED PROMPT - No directional suggestions
  const prompt = `Analyze ${symbol} objectively for WINNING trading opportunities. Be extremely selective.

MARKET DATA:
- Price: ${marketContext.currentPrice}
- RSI(14): ${marketContext.rsi}  
- EMA Fast(21): ${marketContext.emaFast} | EMA Slow(55): ${marketContext.emaSlow}
- EMA Trend: ${marketContext.emaTrend}
- ATR: ${marketContext.atr}
- Bollinger Position: ${marketContext.bbPosition}
- Market Regime: ${marketContext.marketRegime}
- Session: ${marketContext.session}

CRITICAL REQUIREMENTS:
1. ONLY signal if you see a HIGH-PROBABILITY setup (70%+ win rate potential)
2. First take profit MUST be minimum ${config?.minFirstTPPips || 20} pips from entry
3. Stop loss maximum 25 pips from entry  
4. Risk/reward ratio minimum 2:1
5. Require MULTIPLE technical confirmations (RSI + EMA + Volume/ATR)
6. NO BIAS: Analyze purely based on technical merit

RESPOND WITH VALID JSON ONLY:
{
  "direction": "BUY" or "SELL" or "NEUTRAL",
  "confidence": 60-95,
  "entry_price": ${current},
  "stop_loss": number,
  "take_profits": [tp1_min_${config?.minFirstTPPips || 20}_pips, tp2, tp3],
  "analysis": "Technical reasoning for decision"
}

If technical conditions don't strongly support BUY or SELL, choose NEUTRAL.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an objective forex analyst. Analyze technical data without bias. Only suggest signals with strong technical confluence. Prefer NEUTRAL over weak setups.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.3 // Lower temperature for more consistent analysis
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content.trim();
    
    // Clean up the response
    if (aiResponse.startsWith('```json')) {
      aiResponse = aiResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }
    
    console.log(`📝 TIER 2 Raw Response: ${symbol} - ${aiResponse}`);
    
    const parsed = JSON.parse(aiResponse);
    
    // Validate AI response
    if (parsed.direction === 'NEUTRAL' || !parsed.direction) {
      return {
        symbol,
        shouldSignal: false,
        signalType: 'BUY',
        confidence: 0,
        quality: 0,
        entryPrice: current,
        stopLoss: current,
        takeProfits: [],
        analysis: 'Neutral market conditions - no strong technical setup',
        confluenceFactors: [],
        riskLevel: 'HIGH',
        sessionOptimal: false,
        marketConditions: marketContext
      };
    }

    // ENFORCE 20+ PIP REQUIREMENT
    const entryPrice = parsed.entry_price || current;
    const takeProfits = parsed.take_profits || [];
    const stopLoss = parsed.stop_loss || current;
    const pipSize = getPipSize(symbol);
    
    // Validate first take profit is at least required pips
    if (takeProfits.length === 0) {
      console.log(`❌ TIER 2: ${symbol} rejected - no take profits specified`);
      return {
        symbol,
        shouldSignal: false,
        signalType: parsed.direction,
        confidence: 0,
        quality: 0,
        entryPrice,
        stopLoss,
        takeProfits: [],
        analysis: 'No take profits specified',
        confluenceFactors: [],
        riskLevel: 'HIGH',
        sessionOptimal: false,
        marketConditions: marketContext
      };
    }
    
    const firstTPDistance = Math.abs(takeProfits[0] - entryPrice) / pipSize;
    const minPips = config?.minFirstTPPips || 20;
    
    if (firstTPDistance < minPips) {
      console.log(`❌ TIER 2: ${symbol} rejected - first TP only ${firstTPDistance.toFixed(1)} pips (minimum ${minPips} required)`);
      return {
        symbol,
        shouldSignal: false,
        signalType: parsed.direction,
        confidence: parsed.confidence || 0,
        quality: 0,
        entryPrice,
        stopLoss,
        takeProfits,
        analysis: `First TP insufficient: ${firstTPDistance.toFixed(1)} pips < ${minPips} required`,
        confluenceFactors: [],
        riskLevel: 'HIGH',
        sessionOptimal: false,
        marketConditions: marketContext
      };
    }
    
    // Validate stop loss is not too wide (max 25 pips)
    const stopLossDistance = Math.abs(stopLoss - entryPrice) / pipSize;
    if (stopLossDistance > 25) {
      console.log(`❌ TIER 2: ${symbol} rejected - stop loss too wide: ${stopLossDistance.toFixed(1)} pips (maximum 25)`);
      return {
        symbol,
        shouldSignal: false,
        signalType: parsed.direction,
        confidence: parsed.confidence || 0,
        quality: 0,
        entryPrice,
        stopLoss,
        takeProfits,
        analysis: `Stop loss too wide: ${stopLossDistance.toFixed(1)} pips > 25 maximum`,
        confluenceFactors: [],
        riskLevel: 'HIGH',
        sessionOptimal: false,
        marketConditions: marketContext
      };
    }
    
    // Calculate risk/reward ratio
    const riskReward = firstTPDistance / stopLossDistance;
    if (riskReward < 2.0) {
      console.log(`❌ TIER 2: ${symbol} rejected - poor risk/reward: ${riskReward.toFixed(2)} (minimum 2.0)`);
      return {
        symbol,
        shouldSignal: false,
        signalType: parsed.direction,
        confidence: parsed.confidence || 0,
        quality: 0,
        entryPrice,
        stopLoss,
        takeProfits,
        analysis: `Poor risk/reward ratio: ${riskReward.toFixed(2)} < 2.0 required`,
        confluenceFactors: [],
        riskLevel: 'HIGH',
        sessionOptimal: false,
        marketConditions: marketContext
      };
    }

    // Calculate quality score based on technical factors
    const quality = calculateSignalQuality({
      rsi,
      emaFast,
      emaSlow,
      atr,
      current,
      trendStrength,
      volatilityRegime,
      bbPosition: marketContext.bbPosition
    });

    const shouldSignal = quality >= (config?.tier2EscalationQuality || 80) && 
                        (parsed.confidence || 0) >= (config?.tier2EscalationConfidence || 75);

    console.log(`✅ TIER 2 Valid: ${symbol} - ${parsed.direction} @ ${entryPrice}, confidence: ${parsed.confidence}%, quality: ${quality.toFixed(2)}`);

    return {
      symbol,
      shouldSignal,
      signalType: parsed.direction,
      confidence: parsed.confidence || 0,
      quality,
      entryPrice,
      stopLoss,
      takeProfits,
      analysis: parsed.analysis || 'Technical analysis',
      confluenceFactors: ['RSI', 'EMA', 'ATR', 'Session'],
      riskLevel: quality > 85 ? 'LOW' : quality > 70 ? 'MEDIUM' : 'HIGH',
      sessionOptimal: isOptimalSession(getCurrentSessionText()),
      marketConditions: marketContext,
      optimalParametersUsed: optimalParams
    };

  } catch (error) {
    console.error(`❌ TIER 2 ${symbol} error:`, error);
    throw error;
  }
}

// Tier 3: Premium analysis with institutional-grade criteria
async function performTier3Analysis(
  marketData: MarketData,
  historicalData: Map<string, any[]>,
  tier2Analysis: ProfessionalSignalAnalysis,
  openAIApiKey: string,
  optimalParams?: OptimalParameters,
  config?: any
): Promise<ProfessionalSignalAnalysis> {
  const symbol = marketData.symbol;
  const hist = historicalData.get(symbol) || [];
  
  // Enhanced context for institutional-grade analysis
  const prompt = `INSTITUTIONAL QUALITY REVIEW for ${symbol} signal:

PROPOSED SIGNAL:
- Direction: ${tier2Analysis.signalType}
- Entry: ${tier2Analysis.entryPrice}
- Stop Loss: ${tier2Analysis.stopLoss}
- Take Profits: ${tier2Analysis.takeProfits.join(', ')}
- Initial Confidence: ${tier2Analysis.confidence}%

REQUIREMENTS FOR INSTITUTIONAL APPROVAL:
1. Multi-timeframe confluence (H1/H4/D1)
2. Risk management meets fund standards
3. No conflicting fundamental factors
4. Statistical validation of setup
5. Quality score 85+ for publication

Respond with JSON only:
{
  "confidence": 60-95,
  "quality": 60-100,
  "analysis": "Institutional assessment"
}

Confidence <80 or Quality <85 = REJECT signal.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an institutional-grade analyst. Apply the highest quality standards. Reject signals that don\'t meet institutional criteria.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content.trim();
    
    if (aiResponse.startsWith('```json')) {
      aiResponse = aiResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }
    
    console.log(`📝 TIER 3 Raw Response: ${symbol} - ${aiResponse}`);
    
    const parsed = JSON.parse(aiResponse);
    
    const finalConfidence = parsed.confidence || tier2Analysis.confidence;
    const finalQuality = parsed.quality || tier2Analysis.quality;
    
    const shouldSignal = finalConfidence >= (config?.tier3ConfidenceThreshold || 80) && 
                        finalQuality >= (config?.tier3QualityThreshold || 85);
    
    console.log(`✅ TIER 3 Valid: ${symbol} - confidence: ${finalConfidence}%, quality: ${finalQuality}`);
    
    return {
      ...tier2Analysis,
      confidence: finalConfidence,
      quality: finalQuality,
      shouldSignal,
      analysis: parsed.analysis || tier2Analysis.analysis
    };

  } catch (error) {
    console.error(`❌ TIER 3 ${symbol} error:`, error);
    throw error;
  }
}

// Function to monitor signal bias (informational only - no enforcement)
async function monitorSignalBias(supabase: any, existingSignals: any[]) {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentSignals, error } = await supabase
      .from('trading_signals')
      .select('type, confidence, created_at')
      .gte('created_at', twentyFourHoursAgo)
      .eq('is_centralized', true)
      .is('user_id', null);

    if (error) {
      console.warn('⚠️ Could not fetch recent signals for bias monitoring:', error);
      return { bias_detected: false, message: 'Unable to monitor bias', buy_percentage: 50, sell_percentage: 50 };
    }

    const allSignals = [...(existingSignals || []), ...(recentSignals || [])];
    
    if (allSignals.length === 0) {
      return { bias_detected: false, message: 'No signals to analyze', buy_percentage: 0, sell_percentage: 0 };
    }

    const buySignals = allSignals.filter(s => s.type === 'BUY').length;
    const sellSignals = allSignals.filter(s => s.type === 'SELL').length;
    const total = allSignals.length;
    
    const buyPercentage = (buySignals / total) * 100;
    const sellPercentage = (sellSignals / total) * 100;
    
    // INFORMATIONAL ONLY - No restrictions based on bias
    const biasThreshold = 70;
    let biasDetected = false;
    let message = `Distribution: ${buyPercentage.toFixed(1)}% BUY, ${sellPercentage.toFixed(1)}% SELL (market-driven)`;
    
    if (buyPercentage > biasThreshold) {
      biasDetected = true;
      message = `Market showing BULLISH bias: ${buyPercentage.toFixed(1)}% BUY signals (natural market condition)`;
    } else if (sellPercentage > biasThreshold) {
      biasDetected = true;
      message = `Market showing BEARISH bias: ${sellPercentage.toFixed(1)}% SELL signals (natural market condition)`;
    }
    
    console.log(`📊 BIAS MONITORING (informational): ${message}`);
    console.log(`🎯 AUTHENTIC APPROACH: No artificial balancing - let market conditions drive signal direction`);
    
    return {
      bias_detected: biasDetected,
      message,
      buy_percentage: buyPercentage,
      sell_percentage: sellPercentage,
      total_signals: total,
      buy_count: buySignals,
      sell_count: sellSignals
    };
    
  } catch (error) {
    console.warn('⚠️ Error monitoring signal bias:', error);
    return { bias_detected: false, message: 'Error monitoring bias', buy_percentage: 50, sell_percentage: 50 };
  }
}

// Enhanced signal quality calculation
function calculateSignalQuality(indicators: {
  rsi: number;
  emaFast: number;
  emaSlow: number;
  atr: number;
  current: number;
  trendStrength: number;
  volatilityRegime: string;
  bbPosition: string;
}): number {
  let score = 30; // Lower base score - require merit to reach high quality
  
  // RSI contribution (30 points max) - Stricter thresholds
  if (indicators.rsi < 20 || indicators.rsi > 80) {
    score += 30; // Very strong RSI signal
  } else if (indicators.rsi < 25 || indicators.rsi > 75) {
    score += 25; // Strong RSI signal  
  } else if (indicators.rsi < 30 || indicators.rsi > 70) {
    score += 15; // Moderate RSI signal
  } else {
    score -= 10; // Penalty for neutral RSI
  }
  
  // EMA trend strength (25 points max) - Require stronger separation
  const emaSeparation = Math.abs(indicators.emaFast - indicators.emaSlow) / indicators.emaSlow;
  if (emaSeparation > 0.008) {
    score += 25; // Very strong trend
  } else if (emaSeparation > 0.005) {
    score += 20; // Strong trend
  } else if (emaSeparation > 0.003) {
    score += 10; // Moderate trend
  } else {
    score -= 15; // Penalty for no trend
  }
  
  // Trend strength (20 points max)
  if (indicators.trendStrength > 0.8) {
    score += 20; // Very strong trend
  } else if (indicators.trendStrength > 0.6) {
    score += 15; // Strong trend
  } else if (indicators.trendStrength > 0.4) {
    score += 8; // Moderate trend
  } else {
    score -= 10; // Penalty for weak trend
  }
  
  // Volatility (15 points max) - Favor higher volatility for better pip potential
  if (indicators.volatilityRegime === 'high') {
    score += 15; // High volatility good for pip capture
  } else {
    score += 5; // Lower score for normal volatility
  }
  
  // Bollinger Bands position (10 points max) - Extreme positions favored
  if (indicators.bbPosition === 'above_upper' || indicators.bbPosition === 'below_lower') {
    score += 10; // Extreme BB position good for reversal
  } else {
    score += 2; // Minimal score for middle position
  }
  
  return Math.min(100, Math.max(0, score));
}

// Technical analysis helper functions
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

function calculateBollingerBands(prices: number[], period: number, deviation: number) {
  if (prices.length < period) {
    const mid = prices[prices.length - 1] || 0;
    return { upper: mid, middle: mid, lower: mid };
  }
  
  const recentPrices = prices.slice(-period);
  const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
  
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * deviation),
    middle: sma,
    lower: sma - (stdDev * deviation)
  };
}

function calculateTrendStrength(prices: number[]): number {
  if (prices.length < 10) return 0;
  
  const recentPrices = prices.slice(-10);
  const firstPrice = recentPrices[0];
  const lastPrice = recentPrices[recentPrices.length - 1];
  
  return Math.abs(lastPrice - firstPrice) / firstPrice;
}

function getPipSize(symbol: string): number {
  if (symbol.includes('JPY')) {
    return 0.01; // For JPY pairs, pip is 0.01
  }
  return 0.0001; // For most other pairs, pip is 0.0001
}

function findSupportResistanceLevels(prices: number[], currentPrice: number): { support: number[]; resistance: number[] } {
  if (prices.length < 20) return { support: [], resistance: [] };
  
  const levels = [];
  const recentPrices = prices.slice(-50);
  
  // Find local highs and lows
  for (let i = 2; i < recentPrices.length - 2; i++) {
    const current = recentPrices[i];
    const isLocalHigh = current > recentPrices[i-1] && current > recentPrices[i+1] && 
                       current > recentPrices[i-2] && current > recentPrices[i+2];
    const isLocalLow = current < recentPrices[i-1] && current < recentPrices[i+1] && 
                      current < recentPrices[i-2] && current < recentPrices[i+2];
    
    if (isLocalHigh || isLocalLow) {
      levels.push({ price: current, type: isLocalHigh ? 'resistance' : 'support' });
    }
  }
  
  // Filter levels within reasonable range of current price (±5%)
  const relevantLevels = levels.filter(level => {
    const distance = Math.abs(level.price - currentPrice) / currentPrice;
    return distance < 0.05;
  });
  
  const support = relevantLevels.filter(l => l.type === 'support' && l.price < currentPrice).map(l => l.price);
  const resistance = relevantLevels.filter(l => l.type === 'resistance' && l.price > currentPrice).map(l => l.price);
  
  return { support, resistance };
}

function isNearSupportResistance(currentPrice: number, levels: { support: number[]; resistance: number[] }, pipSize: number): boolean {
  const tolerance = pipSize * 10; // Within 10 pips
  
  const nearSupport = levels.support.some(level => Math.abs(currentPrice - level) <= tolerance);
  const nearResistance = levels.resistance.some(level => Math.abs(currentPrice - level) <= tolerance);
  
  return nearSupport || nearResistance;
}