import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Enhanced imports for market session optimization and regime analysis
interface SessionAnalysis {
  session: 'Asian' | 'London' | 'NY' | 'Overlap';
  isOptimal: boolean;
  volatilityMultiplier: number;
  preferredPairs: string[];
  bonusScore: number;
}

interface MarketRegimeAnalysis {
  regime: 'trending' | 'ranging' | 'volatile' | 'breakout';
  strength: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

interface AIAnalysisContext {
  marketRegime: 'trending' | 'ranging' | 'volatile' | 'breakout';
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme';
  session: 'Asian' | 'London' | 'NY' | 'Overlap';
  economicEvents: { hasNearbyEvents: boolean; impactLevel: string };
  supportResistance: { supports: number[]; resistances: number[]; strength: number };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pip calculation utilities (duplicated for edge function)
function isJPYPair(symbol: string): boolean {
  return symbol.includes('JPY');
}

function getPipValue(symbol: string): number {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
}

function calculatePips(entryPrice: number, targetPrice: number, signalType: 'BUY' | 'SELL', symbol: string): number {
  const pipValue = getPipValue(symbol);
  let priceDiff: number;
  
  if (signalType === 'BUY') {
    priceDiff = targetPrice - entryPrice;
  } else { // SELL
    priceDiff = entryPrice - targetPrice;
  }
  
  return Math.round(priceDiff / pipValue);
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

// Configuration for different threshold levels - GENUINE MARKET-DRIVEN APPROACH
const THRESHOLD_CONFIGS = {
  EXTREME: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 80,        // REALISTIC: High quality but achievable
    tier1RequiredConfluences: 4,   // 4+ technical confirmations  
    tier2EscalationQuality: 90,    // Elite quality bar
    tier2EscalationConfidence: 85, // 85%+ confidence required
    tier3QualityThreshold: 95,     // Ultra-institutional quality
    tier3ConfidenceThreshold: 90,  // 90%+ confidence for signal publication
    finalQualityThreshold: 95,     // Final gate quality threshold
    finalConfidenceThreshold: 90,  // Final gate confidence threshold
    maxSignalsPerRun: 2,           // Premium precision - max 2 signals per 5min
    rsiOversoldBuy: 20,            // Extreme RSI levels
    rsiOverboughtSell: 80,         // Extreme RSI levels
    minRewardRisk: 2.5,            // Minimum 2.5:1 reward/risk ratio
    atrMinimumMultiplier: 1.5,     // Higher ATR for sufficient volatility
    economicCalendarBuffer: 90,    // Avoid signals 90min before/after high impact news
    sessionRestriction: true,      // Only London/NY overlap periods
    correlationCheck: true,        // Avoid highly correlated pairs
    minimumGapHours: 48,          // Minimum 48-hour gap between signals on same pair
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    fallbackThreshold: 70,        // Fallback if no signals generated
  },
  ULTRA: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 70,        // BALANCED: Quality with market-driven flexibility
    tier1RequiredConfluences: 4,   // 4+ technical confirmations with fallback
    tier2EscalationQuality: 85,    // High quality bar
    tier2EscalationConfidence: 80, // 80%+ confidence required
    tier3QualityThreshold: 90,     // Institutional quality
    tier3ConfidenceThreshold: 85,  // 85%+ confidence for signal publication
    finalQualityThreshold: 90,     // Final gate quality threshold
    finalConfidenceThreshold: 85,  // Final gate confidence threshold
    maxSignalsPerRun: 3,           // Quality precision - max 3 signals per 5min
    rsiOversoldBuy: 25,            // Selective RSI levels
    rsiOverboughtSell: 75,
    minRewardRisk: 2.0,            // Minimum 2:1 reward/risk ratio
    atrMinimumMultiplier: 1.2,     // Higher ATR for sufficient volatility
    economicCalendarBuffer: 60,    // Avoid signals 60min before/after high impact news
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    fallbackThreshold: 60,        // Fallback if no signals generated
  },
  HIGH: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 60,        // ACHIEVABLE: Quality signals with realistic standards
    tier1RequiredConfluences: 3,   // 3+ technical confirmations
    tier2EscalationQuality: 80,    // Good quality bar
    tier2EscalationConfidence: 75, // 75%+ confidence required
    tier3QualityThreshold: 85,     // Strong quality
    tier3ConfidenceThreshold: 80,  // 80%+ confidence for signal publication
    finalQualityThreshold: 85,     // Final gate quality threshold
    finalConfidenceThreshold: 80,  // Final gate confidence threshold
    maxSignalsPerRun: 5,           // Balanced quantity - max 5 signals per 5min
    rsiOversoldBuy: 30,            // Realistic RSI levels
    rsiOverboughtSell: 70,
    minRewardRisk: 1.8,            // Minimum 1.8:1 reward/risk ratio
    atrMinimumMultiplier: 1.0,     // Standard ATR requirement
    economicCalendarBuffer: 45,    // Avoid signals 45min before/after high impact news
    minTakeProfits: 3,            // Minimum 3 take profit levels
    maxTakeProfits: 4,            // Maximum 4 take profit levels
    fallbackThreshold: 50,        // Fallback if no signals generated
  },
  MEDIUM: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 65,        // SELECTIVE: Require 3+ confluences
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
  },
  LOW: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 55,        // PERMISSIVE: Require 2+ confluences
    tier1RequiredConfluences: 2,   // 2+ technical confirmations
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
  console.log(`🚀 PROFESSIONAL 3-Tier Signal Generation Started - ${new Date().toISOString()}`);
  
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

    console.log(`🎯 Professional Mode - Force: ${force}, Debug: ${debug}, Max Signals: ${maxSignals}`);
    
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

    // Check existing signals with bias monitoring
    const { data: existingSignals } = await supabase
      .from('trading_signals')
      .select('symbol, type, confidence, created_at')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    // Market-driven signal analysis (no artificial bias enforcement)
    const biasCheck = await monitorSignalBias(supabase, existingSignals || []);
    console.log(`📊 Current signal distribution: BUY: ${biasCheck.buy_percentage}%, SELL: ${biasCheck.sell_percentage}%`);
    console.log(`🎯 GENUINE APPROACH: Signals driven by authentic market conditions, not artificial balance`);
    
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

    // Professional 3-Tier Analysis Pipeline with Optimal Parameters
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
    
    const selectedPairs = pairsWithHistory.slice(0, marketData.length); // Analyze all pairs with adequate history
    console.log(`🔥 GENUINE MARKET ANALYSIS: Analyzing ${selectedPairs.length} pairs with enhanced 3-tier system`);

    // 3-Tier Professional Analysis Pipeline with Fallback Mechanism
    let fallbackActivated = false;
    
    for (let i = 0; i < selectedPairs.length && generatedSignals.length < maxNewSignals; i++) {
      const pair = selectedPairs[i];
      
      try {
        console.log(`🎯 [${i + 1}/${selectedPairs.length}] Professional analysis: ${pair.symbol}`);
        
        // Get optimal parameters for this pair if available
        const optimalParams = await getOptimalParametersForPair(supabase, pair.symbol, currentSession);
        console.log(`🎯 Using ${optimalParams ? 'optimal' : 'default'} parameters for ${pair.symbol}`);
        
        // Enhanced Tier 1: Quick local analysis with session and regime awareness
        const tier1Analysis = await performEnhancedTier1Analysis(pair, historicalData, optimalParams, supabase);
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

        // Tier 2: AI-powered analysis for cost-effective signal generation
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
          console.error(`❌ TIER 3: ${pair.symbol} analysis failed, using Tier 2 results:`, error);
          // Gracefully fallback to Tier 2 results if Tier 3 fails
          finalAnalysis = tier2Analysis;
        } finally {
          analysisStats.tier3Analyzed++;
        }

        // CRITICAL: Apply Final Quality Gates before signal insertion
        const finalQualityCheck = finalAnalysis.quality >= CONFIG.finalQualityThreshold;
        const finalConfidenceCheck = finalAnalysis.confidence >= CONFIG.finalConfidenceThreshold;
        
        if (!finalQualityCheck || !finalConfidenceCheck) {
          console.log(`❌ FINAL GATES: ${pair.symbol} rejected`);
          console.log(`   Quality: ${finalAnalysis.quality}/${CONFIG.finalQualityThreshold} ${finalQualityCheck ? '✅' : '❌'}`);
          console.log(`   Confidence: ${finalAnalysis.confidence}%/${CONFIG.finalConfidenceThreshold}% ${finalConfidenceCheck ? '✅' : '❌'}`);
          continue;
        }
        
        console.log(`✅ FINAL GATES: ${pair.symbol} passed all quality thresholds`);
        
        // Convert to signal format and save
        const signalData = convertProfessionalAnalysisToSignal(finalAnalysis, pair);
        
        // Store analysis data in proper database columns
        signalData.t2_confidence = tier2Analysis.confidence;
        signalData.t3_confidence = finalAnalysis.confidence;
        signalData.market_context = {
          ...signalData.market_context,
          parameters_used: optimalParams || getDefaultParameters(),
          market_session: currentSession,
          tier1_score: tier1Analysis.confluenceScore,
          optimal_params_available: !!optimalParams
        };
        
        // Whitelist only valid database columns to prevent schema mismatches
        const validColumns = [
          "symbol", "type", "price", "stop_loss", "take_profits", "confidence", 
          "analysis_text", "timestamp", "status", "is_centralized", "user_id", 
          "final_quality", "risk_reward_ratio", "t1_confirmations", "session_optimal", 
          "market_context", "pips", "t2_confidence", "t3_confidence"
        ];
        
        const filteredSignalData = Object.fromEntries(
          Object.entries(signalData).filter(([key]) => validColumns.includes(key))
        );
        
        const { error: insertError } = await supabase
          .from('trading_signals')
          .insert(filteredSignalData);
        
        if (insertError) {
          console.error(`❌ Failed to save signal for ${pair.symbol}:`, insertError);
          continue;
        }
        
        // Fire background push notification for the new signal (works even if app is closed)
        try {
          const title = `🚨 New ${signalData.type} Signal`;
          const body = `${signalData.symbol} - Entry: ${signalData.price}`;
          await supabase.functions.invoke('send-push-notification', {
            body: {
              title,
              body,
              // Ensure all data values are strings for FCM data payload compatibility
              data: {
                symbol: String(signalData.symbol),
                type: 'new_signal',
                price: String(signalData.price),
                confidence: String(signalData.confidence ?? ''),
                timestamp: new Date().toISOString(),
              },
              notificationType: 'new_signal',
            },
          });
        } catch (notifyErr) {
          console.warn('⚠️ Push notification dispatch failed (non-blocking):', notifyErr);
        }
        
        generatedSignals.push(signalData);
        console.log(`✅ Generated signal for ${pair.symbol}: ${signalData.type} @ ${signalData.price}`);
        
      } catch (error) {
        console.error(`❌ Analysis failed for ${pair.symbol}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;

    console.log(`✅ PROFESSIONAL GENERATION COMPLETE:`);
    console.log(`   📊 Signals Generated: ${generatedSignals.length}/${maxNewSignals}`);
    console.log(`   🎯 Tier 1: ${analysisStats.tier1Passed}/${analysisStats.tier1Analyzed} passed`);
    console.log(`   💰 Tier 2: ${analysisStats.tier2Passed}/${analysisStats.tier2Analyzed} passed`);
    console.log(`   💎 Tier 3: ${analysisStats.tier3Passed}/${analysisStats.tier3Analyzed} passed`);
    console.log(`   💵 Total Cost: $${analysisStats.totalCost.toFixed(4)}`);
    console.log(`   ⏱️ Execution Time: ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      signalsGenerated: generatedSignals.length,
      analysisStats,
      executionTimeMs: executionTime,
      mode: 'professional_3_tier',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Signal generation error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Get optimal parameters for a currency pair from backtesting results
async function getOptimalParametersForPair(supabase: any, symbol: string, session: string = 'all'): Promise<OptimalParameters | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_optimal_parameters', {
        symbol_name: symbol,
        session_name: session,
        volatility_name: 'normal'
      });
    
    if (error) {
      console.error(`Failed to get optimal parameters for ${symbol}:`, error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`Error fetching optimal parameters for ${symbol}:`, error);
    return null;
  }
}

// Get default parameters when no optimal parameters are available
function getDefaultParameters(): OptimalParameters {
  return {
    rsi_oversold: 30,
    rsi_overbought: 70,
    ema_fast_period: 12,
    ema_slow_period: 26,
    atr_period: 14,
    confluence_required: 3,
    min_confluence_score: 55
  };
}

// Get current trading session
function getCurrentSessionText(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 21 || utcHour < 9) return 'Asian';
  if (utcHour >= 9 && utcHour < 17) return 'London';
  return 'New York';
}

// Enhanced historical data fetching - Per symbol to bypass 1000-row API cap
async function getEnhancedHistoricalData(supabase: any, symbols: string[]) {
  console.log(`🔍 Fetching historical data per symbol (${symbols.length} symbols) from live_price_history...`);
  console.log(`📈 historyFetchMode=per-symbol (200 rows each to bypass 1000-row cap)`);
  
  const historicalData = new Map();
  const fetchPromises: Promise<void>[] = [];
  
  // Process symbols in batches to control concurrency
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
    
    fetchPromises.push(...batchPromises);
    
    // Wait for current batch before starting next (respect concurrency limits)
    await Promise.all(batchPromises);
  }
  
  console.log(`✅ Retrieved historical data for ${historicalData.size}/${symbols.length} symbols`);
  return historicalData;
}

// Market regime detection for dynamic threshold adjustment
function detectMarketRegime(prices: number[], atr: number): { regime: string; volatility: string; bias_adjustment: number } {
  if (prices.length < 10) return { regime: 'unknown', volatility: 'normal', bias_adjustment: 0 };
  
  const recentPrices = prices.slice(0, 10);
  const priceRange = Math.max(...recentPrices) - Math.min(...recentPrices);
  const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const volatilityRatio = (priceRange / avgPrice) * 100;
  
  let regime = 'ranging';
  let volatility = 'normal';
  let biasAdjustment = 0;
  
  // Detect trending vs ranging
  const trendStrength = Math.abs(recentPrices[0] - recentPrices[recentPrices.length - 1]) / avgPrice;
  if (trendStrength > 0.005) { // 0.5% directional movement
    regime = recentPrices[0] > recentPrices[recentPrices.length - 1] ? 'uptrending' : 'downtrending';
  } else {
    regime = 'ranging';
    biasAdjustment = 5; // Favor reversal signals in ranging markets
  }
  
  // Volatility classification
  if (volatilityRatio > 1.5) {
    volatility = 'high';
    biasAdjustment += 3; // Slightly favor high volatility setups
  } else if (volatilityRatio < 0.5) {
    volatility = 'low';
    biasAdjustment -= 2; // Penalize low volatility setups
  }
  
  return { regime, volatility, bias_adjustment: biasAdjustment };
}

// Support and resistance detection
function findSupportResistanceLevels(prices: number[], currentPrice: number): { support: number[]; resistance: number[] } {
  if (prices.length < 20) return { support: [], resistance: [] };
  
  const levels = [];
  const recentPrices = prices.slice(0, 50); // Use more data for better levels
  
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

// Helper function for balanced RSI scoring
function calculateRSIScore(rsi: number, oversold: number, overbought: number): { score: number; signal?: string; reason?: string } {
  if (rsi <= oversold) {
    const strength = oversold - rsi;
    return { 
      score: 25 + Math.min(10, strength), 
      signal: `RSI oversold (${rsi.toFixed(1)}, strength: ${strength.toFixed(1)})` 
    };
  } else if (rsi >= overbought) {
    const strength = rsi - overbought;
    return { 
      score: 25 + Math.min(10, strength), 
      signal: `RSI overbought (${rsi.toFixed(1)}, strength: ${strength.toFixed(1)})` 
    };
  } else if (rsi > 45 && rsi < 55) {
    return { score: 5, signal: `RSI neutral zone (${rsi.toFixed(1)})` };
  } else {
    return { score: 0, reason: `RSI neutral (${rsi.toFixed(1)})` };
  }
}

// Helper function for support/resistance confluence
function calculateSRConfluence(currentPrice: number, srLevels: { support: number[]; resistance: number[] }): { score: number; signal?: string } {
  const nearSupport = srLevels.support.some(level => Math.abs(currentPrice - level) / currentPrice < 0.01);
  const nearResistance = srLevels.resistance.some(level => Math.abs(currentPrice - level) / currentPrice < 0.01);
  
  if (nearSupport) {
    return { score: 12, signal: 'Near key support level' };
  } else if (nearResistance) {
    return { score: 12, signal: 'Near key resistance level' };
  }
  
  return { score: 0 };
}

// Tier 1: Enhanced local pre-filtering with bias prevention
async function performTier1Analysis(pair: MarketData, historicalDataMap: Map<string, any[]>, optimalParams?: OptimalParameters) {
  const historicalData = historicalDataMap.get(pair.symbol) || [];
  
  if (!historicalData || historicalData.length < 20) {
    return {
      confluenceScore: 0,
      signals: [],
      details: { reason: 'insufficient_data' }
    };
  }

  const prices = historicalData.slice(0, 50).map(d => d.close_price);
  const currentPrice = pair.current_price;
  
  const params = optimalParams || getDefaultParameters();
  
  // Market regime detection for dynamic adjustment
  const atr = computeATRApprox(prices);
  const currentATR = atr[atr.length - 1] || 0.0001;
  const marketRegime = detectMarketRegime(prices, currentATR);
  
  // Market-adaptive RSI thresholds for genuine signals
  let dynamicRSIOversold = params.rsi_oversold;
  let dynamicRSIOverbought = params.rsi_overbought;
  
  // Adjust RSI thresholds based on genuine market conditions, not artificial balance
  if (marketRegime.regime === 'uptrending') {
    dynamicRSIOversold += 3; // Slightly more lenient oversold in uptrend (market reality)
    dynamicRSIOverbought += 2; // Slightly stricter overbought in uptrend (market reality)
  } else if (marketRegime.regime === 'downtrending') {
    dynamicRSIOversold -= 2; // Slightly stricter oversold in downtrend (market reality)
    dynamicRSIOverbought -= 3; // Slightly more lenient overbought in downtrend (market reality)
  }
  
  // Technical calculations
  const rsi = calculateRSI(prices);
  const currentRSI = rsi[rsi.length - 1] || 50;
  
  const emaFast = calculateEMA(prices, params.ema_fast_period);
  const emaSlow = calculateEMA(prices, params.ema_slow_period);
  const currentEMAFast = emaFast[emaFast.length - 1] || currentPrice;
  const currentEMASlow = emaSlow[emaSlow.length - 1] || currentPrice;
  
  // Support/Resistance analysis
  const srLevels = findSupportResistanceLevels(prices, currentPrice);
  
  const session = getCurrentSessionText();
  const emaDiff = Math.abs(currentEMAFast - currentEMASlow);
  const priceDelta = Math.abs(currentPrice - prices[0]);
  const changeRatio = priceDelta / currentPrice;
  
  // Genuine technical confluence scoring based on market conditions
  let confluenceScore = marketRegime.bias_adjustment; // Start with regime adjustment
  const signals = [];
  const failReasons = [];
  
  // RSI analysis with market-adaptive thresholds
  const rsiScore = calculateRSIScore(currentRSI, dynamicRSIOversold, dynamicRSIOverbought);
  confluenceScore += rsiScore.score;
  if (rsiScore.signal) {
    signals.push(rsiScore.signal);
  } else {
    failReasons.push(rsiScore.reason);
  }
  
  // EMA trend analysis - authentic directional assessment
  const emaCrossStrength = Math.abs(currentEMAFast - currentEMASlow) / currentPrice;
  if (emaCrossStrength > 0.0008) { // Slightly more lenient for genuine signals
    confluenceScore += 20;
    const direction = currentEMAFast > currentEMASlow ? 'Bullish' : 'Bearish';
    signals.push(`${direction} EMA crossover (${(emaCrossStrength*100).toFixed(3)}%)`);
  } else {
    failReasons.push(`Weak EMA separation (${(emaCrossStrength*100).toFixed(3)}%)`);
  }
  
  // Support/Resistance confluence (NEW)
  const srBonus = calculateSRConfluence(currentPrice, srLevels);
  confluenceScore += srBonus.score;
  if (srBonus.signal) signals.push(srBonus.signal);
  
  // Price momentum with genuine volatility assessment
  const momentumThreshold = marketRegime.volatility === 'high' ? 0.0025 : 0.0015; // More realistic thresholds
  if (changeRatio > momentumThreshold) {
    confluenceScore += 15;
    signals.push(`Strong momentum (${(changeRatio*100).toFixed(3)}%)`);
  } else {
    failReasons.push(`Weak momentum (Δ=${priceDelta.toFixed(6)}, %=${(changeRatio*100).toFixed(3)}%)`);
  }
  
  // ATR volatility check (realistic standards)
  const pipSize = pair.symbol.includes('JPY') ? 0.01 : 0.0001;
  const minATR = pipSize * (marketRegime.volatility === 'high' ? 2 : 3); // More achievable ATR requirements
  const atrAdequacy = currentATR >= minATR;
  
  if (atrAdequacy) {
    confluenceScore += 10;
    signals.push(`Adequate volatility (ATR=${currentATR.toFixed(6)})`);
  } else {
    failReasons.push(`Low ATR (${currentATR.toFixed(6)} <= ${minATR.toFixed(6)})`);
  }
  
  // Session timing bonus
  if (session === 'London' || session === 'New York') {
    confluenceScore += 10;
    signals.push(`Optimal session (${session})`);
  }
  
  // Multi-timeframe consistency bonus (simulated)
  if (prices.length >= 5) {
    const short = prices.slice(0, 3);
    const medium = prices.slice(0, 5);
    
    const shortTrend = short[0] > short[short.length - 1] ? 'bullish' : 'bearish';
    const mediumTrend = medium[0] > medium[medium.length - 1] ? 'bullish' : 'bearish';
    
    if (shortTrend === mediumTrend) {
      confluenceScore += 8;
      signals.push(`Multi-timeframe alignment (${shortTrend})`);
    }
  }

  return {
    confluenceScore,
    signals,
    details: {
      rsi: currentRSI,
      ema_fast: currentEMAFast,
      ema_slow: currentEMASlow,
      ema_diff: emaDiff,
      atr: currentATR,
      atr_adequacy_threshold: atrAdequacy,
      pip_size: pipSize,
      price_delta: priceDelta,
      price_change_ratio: changeRatio,
      session,
      market_regime: marketRegime,
      support_levels: srLevels.support,
      resistance_levels: srLevels.resistance,
      parameters_used: params,
      fail_reasons: failReasons
    }
  };
}

// Extract valid JSON from OpenAI response
function extractJsonObject(content: string): any {
  let cleanContent = content.trim();
  
  // Remove markdown code block formatting
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  
  // Find the first valid JSON object by bracket matching
  let braceCount = 0;
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = 0; i < cleanContent.length; i++) {
    if (cleanContent[i] === '{') {
      if (startIndex === -1) startIndex = i;
      braceCount++;
    } else if (cleanContent[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (startIndex !== -1 && endIndex !== -1) {
    const jsonStr = cleanContent.substring(startIndex, endIndex + 1);
    return JSON.parse(jsonStr);
  }
  
  // Fallback to direct parsing
  return JSON.parse(cleanContent);
}

// Enhanced validation for professional signals with take profit requirements
function validateTier2Fields(analysis: any, config: any, symbol?: string): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  if (!analysis.direction || !['BUY', 'SELL'].includes(analysis.direction)) {
    missingFields.push('direction (must be BUY or SELL)');
  }
  
  if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 100) {
    missingFields.push('confidence (must be number 0-100)');
  }
  
  if (typeof analysis.entry_price !== 'number' || analysis.entry_price <= 0) {
    missingFields.push('entry_price (must be positive number)');
  }
  
  if (typeof analysis.stop_loss !== 'number' || analysis.stop_loss <= 0) {
    missingFields.push('stop_loss (must be positive number)');
  }
  
  // Pip validation for stop loss (minimum 20 pips)
  if (analysis.entry_price && analysis.stop_loss && analysis.direction) {
    const symbolToUse = symbol || analysis.symbol || 'EURUSD';
    const stopLossPips = Math.abs(calculatePips(analysis.entry_price, analysis.stop_loss, analysis.direction, symbolToUse));
    if (stopLossPips < 20) {
      missingFields.push(`stop_loss (insufficient pip distance: ${stopLossPips} pips, minimum 20 pips required)`);
    }
  }
  
  // Enhanced take profit validation (MAJOR FIX)
  if (!Array.isArray(analysis.take_profits) || analysis.take_profits.length === 0) {
    missingFields.push('take_profits (must be non-empty array)');
  } else {
    if (analysis.take_profits.length < config.minTakeProfits) {
      missingFields.push(`take_profits (must have at least ${config.minTakeProfits} levels, got ${analysis.take_profits.length})`);
    }
    if (analysis.take_profits.length > config.maxTakeProfits) {
      missingFields.push(`take_profits (must have at most ${config.maxTakeProfits} levels, got ${analysis.take_profits.length})`);
    }
    if (!analysis.take_profits.every((tp: any) => typeof tp === 'number' && tp > 0)) {
      missingFields.push('take_profits (all must be positive numbers)');
    }
    
    // Validate take profit ordering and risk/reward ratios
    const entryPrice = analysis.entry_price;
    const stopLoss = analysis.stop_loss;
    const direction = analysis.direction;
    
    if (entryPrice && stopLoss && direction) {
      const isValidOrdering = direction === 'BUY' 
        ? analysis.take_profits.every((tp: number) => tp > entryPrice) && stopLoss < entryPrice
        : analysis.take_profits.every((tp: number) => tp < entryPrice) && stopLoss > entryPrice;
      
      if (!isValidOrdering) {
        missingFields.push(`take_profits (invalid ordering for ${direction} signal)`);
      }
      
      // Check minimum risk/reward ratio for first TP
      const stopDistance = Math.abs(entryPrice - stopLoss);
      const firstTpDistance = Math.abs(analysis.take_profits[0] - entryPrice);
      const riskReward = firstTpDistance / stopDistance;
      
      if (riskReward < 1.2) { // Minimum 1.2:1 risk/reward
        missingFields.push(`take_profits (insufficient risk/reward ratio: ${riskReward.toFixed(2)}:1, minimum 1.2:1)`);
      }
    }
  }
  
  if (!analysis.analysis || typeof analysis.analysis !== 'string' || analysis.analysis.trim().length === 0) {
    missingFields.push('analysis (must be non-empty string)');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Tier 2 Analysis with enhanced error handling and retry logic
async function performTier2Analysis(
  pair: MarketData,
  historicalDataMap: Map<string, any[]>,
  tier1Analysis: any,
  openaiApiKey: string,
  optimalParams?: OptimalParameters,
  config: any
): Promise<ProfessionalSignalAnalysis> {
  
  const historicalData = historicalDataMap.get(pair.symbol) || [];
  const technicalSummary = prepareTechnicalSummary(pair, historicalData, optimalParams);
  
  // Bias detection and warning system
  const signalBiasCheck = await checkSignalBias(pair.symbol);
  
  const prompt = `Analyze ${pair.symbol} for BALANCED professional trading signal generation.

Technical Analysis:
${technicalSummary}

Tier 1 Analysis Results:
- Confluence Score: ${tier1Analysis.confluenceScore}/100
- Technical Signals: ${tier1Analysis.signals.join(', ')}
- Market Regime: ${tier1Analysis.details.market_regime?.regime || 'unknown'}
- Support/Resistance: ${tier1Analysis.details.support_levels?.length || 0} support, ${tier1Analysis.details.resistance_levels?.length || 0} resistance levels
- Parameters Used: ${optimalParams ? 'Backtesting-Optimized' : 'Default'}

Market Context:
- Current Session: ${getCurrentSessionText()}
- Current Price: ${pair.current_price}
- Volatility: ${tier1Analysis.details.market_regime?.volatility || 'normal'}

CRITICAL BIAS PREVENTION:
${signalBiasCheck.warning || ''}
- MUST generate signals in BOTH directions when technical conditions warrant
- BUY signals: Look for oversold RSI + bullish EMA alignment + support levels
- SELL signals: Look for overbought RSI + bearish EMA alignment + resistance levels
- Recent ${pair.symbol} bias: ${signalBiasCheck.recent_bias || 'balanced'}

PROFESSIONAL REQUIREMENTS:
- Quality Score must be ${config.finalQualityThreshold}+ (based on technical confluences)
- Confidence must be ${config.finalConfidenceThreshold}%+ for signal approval
- MANDATORY: Exactly ${config.minTakeProfits}-${config.maxTakeProfits} take profit levels
- MANDATORY: Stop loss must be at least 20 pips from entry price
- Minimum 1.2:1 risk/reward ratio for first take profit
- Progressive take profit spacing (each TP further than the previous)

Generate a BALANCED trading signal. Consider BOTH BUY and SELL possibilities based on technical analysis.

CRITICAL: You MUST provide ${config.minTakeProfits}-${config.maxTakeProfits} take profit levels AND ensure stop loss is AT LEAST 20 PIPS from entry. Signals not meeting these requirements will be REJECTED.

Required JSON format (minified, no extra text):
{"direction": "BUY", "confidence": 78, "entry_price": 1.2345, "stop_loss": 1.2300, "take_profits": [1.2400, 1.2460, 1.2520], "analysis": "Strong bullish confluence: RSI oversold recovery (28.5), bullish EMA crossover, near key support at 1.2340. Multi-timeframe alignment confirms upward momentum."}

Example SELL signal:
{"direction": "SELL", "confidence": 82, "entry_price": 1.2345, "stop_loss": 1.2390, "take_profits": [1.2290, 1.2230, 1.2170], "analysis": "Bearish confluence: RSI overbought (76.2), bearish EMA divergence, rejection at resistance 1.2350. Volume confirms selling pressure."}

RETURN ONLY THE JSON OBJECT. NO ADDITIONAL TEXT OR EXPLANATIONS.`;

  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      console.log(`🎯 TIER 2 Request: ${pair.symbol} (attempt ${attempt + 1}/${maxRetries})`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ TIER 2 OpenAI Error: ${pair.symbol} - ${response.status} ${response.statusText} - ${errorText}`);
        
        if (response.status === 429 && attempt < maxRetries - 1) {
          console.log(`⏳ TIER 2 Rate limit, retrying in ${(attempt + 1) * 2}s...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
          attempt++;
          continue;
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Empty response from OpenAI');
      }
      
      const analysis = extractJsonObject(result.choices[0].message.content);
      console.log(`📝 TIER 2 Raw Response: ${pair.symbol} - ${JSON.stringify(analysis)}`);
      
      // Enhanced validation with config requirements
      const validation = validateTier2Fields(analysis, config, pair.symbol);
      if (!validation.isValid) {
        console.log(`❌ TIER 2 Validation Failed: ${pair.symbol} - Missing: ${validation.missingFields.join(', ')}`);
        if (attempt < maxRetries - 1) {
          attempt++;
          continue;
        }
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
      }
      
      // Enhanced quality calculation for MEDIUM/HIGH thresholds
      const enhancedQuality = Math.min(100, 
        tier1Analysis.confluenceScore + 
        (analysis.confidence >= 80 ? 15 : analysis.confidence >= 70 ? 10 : 5) +
        (optimalParams ? 5 : 0)
      );
      
      const stopLossPips = Math.abs(calculatePips(analysis.entry_price, analysis.stop_loss, analysis.direction, pair.symbol));
      console.log(`✅ TIER 2 Valid: ${pair.symbol} - ${analysis.direction} @ ${analysis.entry_price}, confidence: ${analysis.confidence}%, quality: ${enhancedQuality}, stop loss: ${stopLossPips} pips`);
      
      return {
        symbol: pair.symbol,
        shouldSignal: analysis.confidence >= config.tier2EscalationConfidence,
        signalType: analysis.direction,
        confidence: analysis.confidence,
        quality: enhancedQuality,
        entryPrice: analysis.entry_price,
        stopLoss: analysis.stop_loss,
        takeProfits: analysis.take_profits,
        analysis: analysis.analysis,
        confluenceFactors: tier1Analysis.signals,
        riskLevel: analysis.confidence >= 80 ? 'LOW' : analysis.confidence >= 65 ? 'MEDIUM' : 'HIGH',
        sessionOptimal: getCurrentSessionText() !== 'Asian',
        marketConditions: tier1Analysis.details,
        optimalParametersUsed: optimalParams
      };
      
    } catch (error) {
      console.error(`❌ TIER 2 Error (attempt ${attempt + 1}): ${pair.symbol} -`, error);
      if (attempt >= maxRetries - 1) {
        throw error;
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('All Tier 2 attempts failed');
}

// Validate required fields for Tier 3 refinement
function validateTier3Fields(analysis: any): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 100) {
    missingFields.push('confidence (must be number 0-100)');
  }
  
  if (analysis.analysis && typeof analysis.analysis !== 'string') {
    missingFields.push('analysis (must be string if provided)');
  }
  
  if (analysis.quality && (typeof analysis.quality !== 'number' || analysis.quality < 0)) {
    missingFields.push('quality (must be positive number if provided)');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Tier 3 Analysis with enhanced error handling and quality validation
async function performTier3Analysis(
  pair: MarketData,
  historicalDataMap: Map<string, any[]>,
  tier2Analysis: ProfessionalSignalAnalysis,
  openaiApiKey: string,
  optimalParams?: OptimalParameters,
  config: any
): Promise<ProfessionalSignalAnalysis> {
  
  const prompt = `Professional institutional-grade analysis for ${pair.symbol}.

Previous Analysis:
- Tier 2 Confidence: ${tier2Analysis.confidence}%
- Signal Type: ${tier2Analysis.signalType}
- Quality Score: ${tier2Analysis.quality}
- Entry Price: ${tier2Analysis.entryPrice}
- Stop Loss: ${tier2Analysis.stopLoss} (${Math.abs(calculatePips(tier2Analysis.entryPrice, tier2Analysis.stopLoss, tier2Analysis.signalType, pair.symbol))} pips)
- Take Profits: ${tier2Analysis.takeProfits}

Enhanced Context:
- Optimal Parameters Available: ${!!optimalParams}
- Market Session: ${getCurrentSessionText()}
- Risk Level: ${tier2Analysis.riskLevel}

CRITICAL FINAL VALIDATION REQUIREMENTS:
- MUST exceed ${config.finalQualityThreshold} quality score for signal approval
- MUST exceed ${config.finalConfidenceThreshold}% confidence for publication
- Stop loss MUST be at least 20 pips from entry (currently ${Math.abs(calculatePips(tier2Analysis.entryPrice, tier2Analysis.stopLoss, tier2Analysis.signalType, pair.symbol))} pips)
- Institutional-grade risk assessment required

Perform final validation and refinement for institutional-grade signal quality.

Requirements:
- Minimum ${config.tier3ConfidenceThreshold}% confidence for signal approval
- Quality score must justify ${config.finalQualityThreshold}+ threshold
- Risk-adjusted validation
- Multi-timeframe confirmation
- Economic calendar awareness

Provide refined confidence, quality, and analysis. DO NOT change entry price, stop loss, or take profits.

RETURN ONLY A JSON OBJECT. RESPONSE MUST BE VALID JSON ONLY.

{
  "confidence": 85,
  "quality": 90,
  "analysis": "Institutional-grade signal with multi-timeframe confirmation and strict quality validation"
}`;

  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      console.log(`🎯 TIER 3 Request: ${pair.symbol} (attempt ${attempt + 1}/${maxRetries})`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ TIER 3 OpenAI Error: ${pair.symbol} - ${response.status} ${response.statusText} - ${errorText}`);
        
        if (response.status === 429 && attempt < maxRetries - 1) {
          console.log(`⏳ TIER 3 Rate limit, retrying in ${(attempt + 1) * 3}s...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 3000));
          attempt++;
          continue;
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Empty response from OpenAI');
      }
      
      const refinedAnalysis = extractJsonObject(result.choices[0].message.content);
      console.log(`📝 TIER 3 Raw Response: ${pair.symbol} - ${JSON.stringify(refinedAnalysis)}`);
      
      // Validate required fields
      const validation = validateTier3Fields(refinedAnalysis);
      if (!validation.isValid) {
        console.log(`❌ TIER 3 Validation Failed: ${pair.symbol} - Missing: ${validation.missingFields.join(', ')}`);
        if (attempt < maxRetries - 1) {
          attempt++;
          continue;
        }
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
      }
      
      // Enhanced quality validation with explicit institutional criteria
      const finalQuality = Math.max(
        tier2Analysis.quality,
        refinedAnalysis.quality || tier2Analysis.quality,
        // Bonus for institutional validation
        tier2Analysis.quality + (refinedAnalysis.confidence >= config.finalConfidenceThreshold ? 10 : 0)
      );
      
      console.log(`✅ TIER 3 Valid: ${pair.symbol} - confidence: ${refinedAnalysis.confidence}%, quality: ${finalQuality}`);
      
      return {
        ...tier2Analysis,
        shouldSignal: refinedAnalysis.confidence >= config.tier3ConfidenceThreshold,
        confidence: refinedAnalysis.confidence,
        quality: finalQuality,
        analysis: refinedAnalysis.analysis || tier2Analysis.analysis,
        optimalParametersUsed: optimalParams
      };
      
    } catch (error) {
      console.error(`❌ TIER 3 Error (attempt ${attempt + 1}): ${pair.symbol} -`, error);
      if (attempt >= maxRetries - 1) {
        // Graceful fallback to Tier 2 with penalty
        console.log(`⚠️ TIER 3 Fallback: Using Tier 2 results with quality penalty for ${pair.symbol}`);
        return {
          ...tier2Analysis,
          quality: Math.max(0, tier2Analysis.quality - 10), // Quality penalty for Tier 3 failure
          analysis: `${tier2Analysis.analysis} (Note: Advanced validation unavailable)`
        };
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // Should not reach here due to fallback above
  throw new Error('All Tier 3 attempts failed');
}

// Convert analysis to signal format
function convertProfessionalAnalysisToSignal(analysis: ProfessionalSignalAnalysis, marketData: MarketData): SignalData {
  return {
    symbol: analysis.symbol,
    type: analysis.signalType,
    price: analysis.entryPrice,
    stop_loss: analysis.stopLoss,
    take_profits: analysis.takeProfits,
    confidence: analysis.confidence,
    analysis_text: analysis.analysis,
    timestamp: new Date().toISOString(),
    status: 'active',
    is_centralized: true,
    user_id: null,
    final_quality: analysis.quality || 0,
    risk_reward_ratio: analysis.riskLevel === 'high' ? 3.0 : analysis.riskLevel === 'medium' ? 2.0 : 1.0,
    t1_confirmations: analysis.confluenceFactors || [],
    session_optimal: analysis.sessionOptimal || false,
    market_context: {
      timeframe: '1H',
      conditions: analysis.marketConditions,
      optimal_parameters_used: analysis.optimalParametersUsed,
      session: analysis.sessionOptimal
    },
    pips: 0 // Will be calculated by monitoring system
  };
}

// Technical analysis helper functions
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi = [];
  const changes = [];
  
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  for (let i = period; i < changes.length; i++) {
    const gains = changes.slice(i - period, i).filter(x => x > 0);
    const losses = changes.slice(i - period, i).filter(x => x < 0).map(x => Math.abs(x));
    
    const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function calculateEMA(prices: number[], period: number): number[] {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  ema[0] = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

function computeATRApprox(prices: number[], period: number = 14): number[] {
  const atr = [];
  
  for (let i = period; i < prices.length; i++) {
    const slice = prices.slice(i - period, i);
    const ranges = [];
    
    for (let j = 1; j < slice.length; j++) {
      ranges.push(Math.abs(slice[j] - slice[j - 1]));
    }
    
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    atr.push(avgRange);
  }
  
  return atr;
}

function prepareTechnicalSummary(pair: MarketData, historicalData: any[], optimalParams?: OptimalParameters): string {
  if (!historicalData || historicalData.length < 20) {
    return `Limited historical data available for ${pair.symbol}. Current price: ${pair.current_price}`;
  }

  const prices = historicalData.slice(0, 20).map(d => d.close_price);
  const rsi = calculateRSI(prices);
  const currentRSI = rsi[rsi.length - 1] || 50;
  
  const emaFast = calculateEMA(prices, 12);
  const emaSlow = calculateEMA(prices, 26);
  const currentEMAFast = emaFast[emaFast.length - 1] || pair.current_price;
  const currentEMASlow = emaSlow[emaSlow.length - 1] || pair.current_price;
  
  const atr = computeATRApprox(prices);
  const currentATR = atr[atr.length - 1] || 0.0001;
  
  const params = optimalParams || getDefaultParameters();
  const srLevels = findSupportResistanceLevels(prices, pair.current_price);
  
  return `${pair.symbol} Technical Summary:
- Current Price: ${pair.current_price}
- RSI(14): ${currentRSI.toFixed(2)} (Oversold<${params.rsi_oversold}, Overbought>${params.rsi_overbought})
- EMA Fast(${params.ema_fast_period}): ${currentEMAFast.toFixed(5)}
- EMA Slow(${params.ema_slow_period}): ${currentEMASlow.toFixed(5)}
- EMA Alignment: ${currentEMAFast > currentEMASlow ? 'Bullish' : 'Bearish'}
- ATR(14): ${currentATR.toFixed(6)} (Volatility: ${currentATR > 0.0005 ? 'High' : currentATR > 0.0002 ? 'Medium' : 'Low'})
- Support Levels: ${srLevels.support.length} identified
- Resistance Levels: ${srLevels.resistance.length} identified
- Parameters Source: ${optimalParams ? 'Backtesting-Optimized' : 'Default'}
- 24h Change: ${pair.price_change_24h || 0}%
- Session: ${getCurrentSessionText()}`;
}

// Market-driven signal analysis (no artificial bias enforcement)
async function monitorSignalBias(supabase: any, existingSignals: any[]): Promise<{ bias_detected: boolean; message: string; buy_percentage: number; sell_percentage: number }> {
  // Check recent signals (last 7 days) for monitoring purposes only
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentSignals } = await supabase
    .from('trading_signals')
    .select('type, created_at')
    .eq('is_centralized', true)
    .is('user_id', null)
    .gte('created_at', sevenDaysAgo.toISOString());
  
  if (!recentSignals || recentSignals.length < 5) {
    return { bias_detected: false, message: 'Insufficient data for distribution analysis', buy_percentage: 50, sell_percentage: 50 };
  }
  
  const buyCount = recentSignals.filter(s => s.type === 'BUY').length;
  const sellCount = recentSignals.filter(s => s.type === 'SELL').length;
  const total = buyCount + sellCount;
  
  const buyPercentage = Math.round((buyCount / total) * 100);
  const sellPercentage = Math.round((sellCount / total) * 100);
  
  const extremeThreshold = 85; // Only flag extreme imbalances (85%+)
  let biasDetected = false;
  let message = '';
  
  if (buyPercentage > extremeThreshold) {
    biasDetected = true;
    message = `Very high BUY signal distribution: ${buyPercentage}% in last 7 days. This reflects current market conditions.`;
  } else if (sellPercentage > extremeThreshold) {
    biasDetected = true;
    message = `Very high SELL signal distribution: ${sellPercentage}% in last 7 days. This reflects current market conditions.`;
  } else {
    message = `Signal distribution reflects genuine market conditions: ${buyPercentage}% BUY, ${sellPercentage}% SELL`;
  }
  
  return { bias_detected: biasDetected, message, buy_percentage: buyPercentage, sell_percentage: sellPercentage };
}

async function checkSignalBias(symbol: string): Promise<{ warning?: string; recent_bias?: string }> {
  // Market-driven analysis - no artificial balance enforcement
  return {
    warning: 'ANALYZE GENUINE MARKET CONDITIONS: Let technical analysis determine signal direction naturally.',
    recent_bias: 'market_driven_analysis'
  };
}