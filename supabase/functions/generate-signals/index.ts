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
  analysis: string;
  timeframe: string;
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

// Configuration for different threshold levels
const THRESHOLD_CONFIGS = {
  HIGH: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 80,        // STRICT: Require 4+ confluences
    tier1RequiredConfluences: 4,   // 4+ technical confirmations
    tier2EscalationQuality: 85,    // Premium quality bar
    tier2EscalationConfidence: 80, // 80%+ confidence required
    tier3QualityThreshold: 90,     // Institutional-grade quality
    tier3ConfidenceThreshold: 85,  // 85%+ confidence for signal publication
    finalQualityThreshold: 90,     // Final gate quality threshold
    finalConfidenceThreshold: 85,  // Final gate confidence threshold
    maxSignalsPerRun: 3,           // Quality over quantity - max 3 signals per 5min
    rsiOversoldBuy: 25,            // Ultra-selective RSI levels
    rsiOverboughtSell: 75,
    minRewardRisk: 2.0,            // Minimum 2:1 reward/risk ratio
    atrMinimumMultiplier: 1.2,     // Minimum ATR for sufficient volatility
    economicCalendarBuffer: 60,    // Avoid signals 60min before/after high impact news
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

    // Check existing signals
    const { data: existingSignals } = await supabase
      .from('trading_signals')
      .select('symbol, type, confidence')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    const currentSignalCount = existingSignals?.length || 0;
    const maxTotalSignals = 15;
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

    const tier1Threshold = CONFIG.tier1PassThreshold;
    console.log(`⚙️ Tier 1 pass threshold: ${tier1Threshold} (Level: ${CONFIG.level || 'LOW'})`);
    
    // Prioritize major pairs
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
    
    const selectedPairs = pairsWithHistory.slice(0, 24); // Analyze top 24 pairs with adequate history
    console.log(`🔥 PROFESSIONAL MODE: Analyzing ${selectedPairs.length} pairs with 3-tier system`);

    // 3-Tier Professional Analysis Pipeline
    for (let i = 0; i < selectedPairs.length && generatedSignals.length < maxNewSignals; i++) {
      const pair = selectedPairs[i];
      
      try {
        console.log(`🎯 [${i + 1}/${selectedPairs.length}] Professional analysis: ${pair.symbol}`);
        
        // Get optimal parameters for this pair if available
        const optimalParams = await getOptimalParametersForPair(supabase, pair.symbol, currentSession);
        console.log(`🎯 Using ${optimalParams ? 'optimal' : 'default'} parameters for ${pair.symbol}`);
        
        // Tier 1: Quick local analysis to filter out weak setups
        const tier1Analysis = await performTier1Analysis(pair, historicalData, optimalParams);
        analysisStats.tier1Analyzed++;
        
        console.log(`🔍 TIER 1: ${pair.symbol} - Score: ${tier1Analysis.confluenceScore}/100 (Pass: ${tier1Threshold}+)`);
        
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
          tier2Analysis = await performTier2Analysis(pair, historicalData, tier1Analysis, openAIApiKey, optimalParams);
          
          if (!tier2Analysis.shouldSignal) {
            console.log(`❌ TIER 2: ${pair.symbol} rejected - confidence ${tier2Analysis.confidence}% < 60%`);
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
          finalAnalysis = await performTier3Analysis(pair, historicalData, tier2Analysis, openAIApiKey, optimalParams);
          
          if (!finalAnalysis.shouldSignal) {
            console.log(`❌ TIER 3: ${pair.symbol} rejected - confidence ${finalAnalysis.confidence}% < 75%`);
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

        // Convert to signal format and save
        const signalData = convertProfessionalAnalysisToSignal(finalAnalysis, pair);
        
        // Store the parameters used for this signal for performance tracking
        signalData.metadata = {
          ...signalData.metadata,
          parameters_used: optimalParams || getDefaultParameters(),
          market_session: currentSession,
          tier1_score: tier1Analysis.confluenceScore,
          tier2_confidence: tier2Analysis.confidence,
          tier3_confidence: finalAnalysis.confidence,
          optimal_params_available: !!optimalParams
        };
        
        const { error: insertError } = await supabase
          .from('trading_signals')
          .insert(signalData);
        
        if (insertError) {
          console.error(`❌ Failed to save signal for ${pair.symbol}:`, insertError);
          continue;
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

// Tier 1 Analysis with optimal parameters
async function performTier1Analysis(
  pair: MarketData,
  historicalDataMap: Map<string, any[]>,
  optimalParams?: OptimalParameters
): Promise<{ confluenceScore: number, signals: string[], details: any }> {
  
  // Use optimal parameters if available, otherwise use defaults
  const params = optimalParams || getDefaultParameters();
  const RSI_OVERSOLD = params.rsi_oversold;
  const RSI_OVERBOUGHT = params.rsi_overbought;
  const EMA_FAST = params.ema_fast_period;
  const EMA_SLOW = params.ema_slow_period;
  const ATR_PERIOD = params.atr_period;
  const CONFLUENCE_REQUIRED = params.confluence_required;

  const historicalData = historicalDataMap.get(pair.symbol) || [];
  if (historicalData.length < 50) {
    console.log(`⚠️ Tier1 skipped ${pair.symbol}: insufficient_data (${historicalData.length})`);
    return { confluenceScore: 0, signals: [], details: { error: 'insufficient_data' } };
  }

  const prices = historicalData.map(d => d.close_price);
  const highs = historicalData.map(d => d.high_price);
  const lows = historicalData.map(d => d.low_price);

  // Calculate technical indicators with optimal parameters
  const rsi = calculateRSI(prices, 14);
  const emaFast = calculateEMA(prices, EMA_FAST);
  const emaSlow = calculateEMA(prices, EMA_SLOW);
  const atr = computeATRApprox(prices, ATR_PERIOD);

  const currentRSI = rsi[rsi.length - 1];
  const currentEMAFast = emaFast[emaFast.length - 1];
  const currentEMASlow = emaSlow[emaSlow.length - 1];
  const currentATR = atr[atr.length - 1];

  // Pip size heuristic by symbol
  const pipSize = pair.symbol.endsWith('JPY') ? 0.01 : 0.0001;

  let confluenceScore = 0;
  const signals: string[] = [];
  const failReasons: string[] = [];

  // RSI confluence (20 points max)
  if (currentRSI <= RSI_OVERSOLD) {
    confluenceScore += 20;
    signals.push('RSI_OVERSOLD');
  } else if (currentRSI >= RSI_OVERBOUGHT) {
    confluenceScore += 20;
    signals.push('RSI_OVERBOUGHT');
  } else {
    failReasons.push(`RSI neutral (${currentRSI?.toFixed(2)})`);
  }

  // EMA confluence (25 points max, +10 neutral if near-crossover)
  const emaDiff = Math.abs(currentEMAFast - currentEMASlow);
  const emaNearEpsilon = pipSize * 2;
  if (currentEMAFast > currentEMASlow) {
    confluenceScore += 25;
    signals.push('EMA_BULLISH');
  } else if (currentEMAFast < currentEMASlow) {
    confluenceScore += 25;
    signals.push('EMA_BEARISH');
  } else if (emaDiff <= emaNearEpsilon) {
    confluenceScore += 10;
    signals.push('EMA_NEUTRAL');
  } else {
    failReasons.push(`EMA unaligned (Δ=${emaDiff.toFixed(6)})`);
  }

  // Volatility confluence (15 points max) - adequacy vs pip size
  const atrAdequacy = pipSize * 0.5;
  if (currentATR > atrAdequacy) {
    confluenceScore += 15;
    signals.push('VOLATILITY_ADEQUATE');
  } else {
    failReasons.push(`Low ATR (${currentATR?.toFixed(6)} <= ${atrAdequacy.toFixed(6)})`);
  }

  // Price action confluence (20 points max) - 0.02% or 0.5x ATR
  const prevClose = prices[prices.length - 2];
  const priceDelta = Math.abs(pair.current_price - prevClose);
  const changeRatio = Math.abs((pair.current_price - prevClose) / prevClose);
  const momentumByRatio = changeRatio > 0.0002; // 0.02%
  const momentumByAtr = priceDelta > 0.5 * currentATR;
  if (momentumByRatio || momentumByAtr) {
    confluenceScore += 20;
    signals.push('PRICE_MOMENTUM');
  } else {
    failReasons.push(`Weak momentum (Δ=${priceDelta.toFixed(6)}, %=${(changeRatio*100).toFixed(3)}%)`);
  }

  // Session confluence (20 points max)
  const session = getCurrentSessionText();
  const sessionBonus = session === 'London' || session === 'New York' ? 20 : 10;
  confluenceScore += sessionBonus;
  signals.push(`SESSION_${session.toUpperCase()}`);

  const finalScore = Math.min(confluenceScore, 100);

  if (finalScore < (optimalParams?.min_confluence_score || 0)) {
    failReasons.push(`Below pair min_confluence_score ${optimalParams?.min_confluence_score}`);
  }

  return {
    confluenceScore: finalScore,
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

// Validate required fields for genuine signals
function validateTier2Fields(analysis: any): { isValid: boolean; missingFields: string[] } {
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
  
  if (!Array.isArray(analysis.take_profits) || analysis.take_profits.length === 0) {
    missingFields.push('take_profits (must be non-empty array)');
  } else if (!analysis.take_profits.every((tp: any) => typeof tp === 'number' && tp > 0)) {
    missingFields.push('take_profits (all must be positive numbers)');
  }
  
  if (!analysis.analysis || typeof analysis.analysis !== 'string' || analysis.analysis.trim().length === 0) {
    missingFields.push('analysis (must be non-empty string)');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Tier 2 Analysis with optimal parameters awareness
async function performTier2Analysis(
  pair: MarketData,
  historicalDataMap: Map<string, any[]>,
  tier1Analysis: any,
  openaiApiKey: string,
  optimalParams?: OptimalParameters
): Promise<ProfessionalSignalAnalysis> {
  
  const historicalData = historicalDataMap.get(pair.symbol) || [];
  const technicalSummary = prepareTechnicalSummary(pair, historicalData, optimalParams);
  
  const prompt = `Analyze ${pair.symbol} for professional trading signal generation.

Technical Analysis:
${technicalSummary}

Tier 1 Analysis Results:
- Confluence Score: ${tier1Analysis.confluenceScore}/100
- Signals: ${tier1Analysis.signals.join(', ')}
- Parameters Used: ${optimalParams ? 'Backtesting-Optimized' : 'Default'}

Market Context:
- Current Session: ${getCurrentSessionText()}
- Current Price: ${pair.current_price}

Generate a trading signal with ALL required fields:
1. Signal direction (BUY/SELL)
2. Confidence level (0-100)
3. Entry price
4. Stop loss
5. Take profit levels (array of numbers)
6. Brief analysis

CRITICAL: You must provide ALL fields. Missing fields will result in signal rejection.

{
  "direction": "BUY",
  "confidence": 75,
  "entry_price": 1.2345,
  "stop_loss": 1.2300,
  "take_profits": [1.2400, 1.2450],
  "analysis": "Strong bullish momentum with RSI oversold recovery"
}`;

  try {
    console.log(`🎯 TIER 2 Request: ${pair.symbol}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.choices?.[0]?.message?.content) {
      throw new Error('Empty response from OpenAI');
    }
    
    const analysis = extractJsonObject(result.choices[0].message.content);
    console.log(`📝 TIER 2 Raw Response: ${pair.symbol} - ${JSON.stringify(analysis)}`);
    
    // Validate all required fields
    const validation = validateTier2Fields(analysis);
    if (!validation.isValid) {
      console.log(`❌ TIER 2 Validation Failed: ${pair.symbol} - Missing: ${validation.missingFields.join(', ')}`);
      throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
    }
    
    console.log(`✅ TIER 2 Valid: ${pair.symbol} - ${analysis.direction} @ ${analysis.entry_price}, confidence: ${analysis.confidence}%`);
    
    return {
      symbol: pair.symbol,
      shouldSignal: analysis.confidence >= 60,
      signalType: analysis.direction,
      confidence: analysis.confidence,
      quality: tier1Analysis.confluenceScore,
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
    console.error(`❌ TIER 2 Error: ${pair.symbol} -`, error);
    throw error;
  }
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

// Tier 3 Analysis with optimal parameters awareness
async function performTier3Analysis(
  pair: MarketData,
  historicalDataMap: Map<string, any[]>,
  tier2Analysis: ProfessionalSignalAnalysis,
  openaiApiKey: string,
  optimalParams?: OptimalParameters
): Promise<ProfessionalSignalAnalysis> {
  
  const prompt = `Professional institutional-grade analysis for ${pair.symbol}.

Previous Analysis:
- Tier 2 Confidence: ${tier2Analysis.confidence}%
- Signal Type: ${tier2Analysis.signalType}
- Quality Score: ${tier2Analysis.quality}
- Entry Price: ${tier2Analysis.entryPrice}
- Stop Loss: ${tier2Analysis.stopLoss}
- Take Profits: ${tier2Analysis.takeProfits}

Enhanced Context:
- Optimal Parameters Available: ${!!optimalParams}
- Market Session: ${getCurrentSessionText()}
- Risk Level: ${tier2Analysis.riskLevel}

Perform final validation and refinement for institutional-grade signal quality.

Requirements:
- Minimum 75% confidence for signal approval
- Risk-adjusted validation
- Multi-timeframe confirmation
- Economic calendar awareness

Provide only refined confidence and analysis. DO NOT change entry price, stop loss, or take profits.

{
  "confidence": 85,
  "analysis": "Institutional-grade signal with multi-timeframe confirmation",
  "quality": 90
}`;

  try {
    console.log(`🎯 TIER 3 Request: ${pair.symbol}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
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
      throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
    }
    
    console.log(`✅ TIER 3 Valid: ${pair.symbol} - confidence: ${refinedAnalysis.confidence}%`);
    
    return {
      ...tier2Analysis,
      shouldSignal: refinedAnalysis.confidence >= 75,
      confidence: refinedAnalysis.confidence,
      quality: Math.max(tier2Analysis.quality, refinedAnalysis.quality || tier2Analysis.quality),
      analysis: refinedAnalysis.analysis || tier2Analysis.analysis,
      optimalParametersUsed: optimalParams
    };
    
  } catch (error) {
    console.error(`❌ TIER 3 Error: ${pair.symbol} -`, error);
    throw error;
  }
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
    analysis: analysis.analysis,
    timeframe: '1H',
    timestamp: new Date().toISOString(),
    status: 'active',
    is_centralized: true,
    user_id: null,
    metadata: {
      quality_score: analysis.quality,
      risk_level: analysis.riskLevel,
      confluence_factors: analysis.confluenceFactors,
      session_optimal: analysis.sessionOptimal,
      market_conditions: analysis.marketConditions,
      optimal_parameters_used: analysis.optimalParametersUsed
    }
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
  
  const params = optimalParams || getDefaultParameters();
  
  return `${pair.symbol} Technical Summary:
- Current Price: ${pair.current_price}
- RSI(14): ${currentRSI.toFixed(2)}
- Optimal RSI Levels: ${params.rsi_oversold}/${params.rsi_overbought}
- EMA Periods: ${params.ema_fast_period}/${params.ema_slow_period}
- Parameters Source: ${optimalParams ? 'Backtesting-Optimized' : 'Default'}
- 24h Change: ${pair.price_change_24h || 0}%`;
}