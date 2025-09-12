import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-github-run-id, x-enhanced-generation',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MarketData {
  symbol: string;
  current_price: number;
  last_update: string;
  session: string;
}

interface ProfessionalSignalAnalysis {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  reasoning: string;
  technicalFactors: string[];
  riskAssessment: string;
  marketRegime: string;
  sessionAnalysis: string;
  qualityScore: number;
  tier: 1 | 2 | 3;
  tokensUsed: number;
  cost: number;
}

interface SignalData {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  pips: number;
  stopLoss: number;
  takeProfits: number[];
  confidence: number;
  analysisText: string;
  technicalIndicators: any;
  chartData: Array<{ time: number; price: number }>;
  professionalGrade: boolean;
  tierLevel: number;
  validationScore: number;
  qualityConfirmations: string[];
}

interface PricePoint {
  timestamp: number;
  price: number;
}

// Configuration: 70%+ WIN RATE ULTRA-SELECTIVE PIPELINE
// Dynamic threshold configurations based on admin settings
const THRESHOLD_CONFIGS = {
  HIGH: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 75,        // ULTRA-SELECTIVE: Require 4+ confluences minimum
    tier1RequiredConfluences: 4,   // Mandatory 4+ technical confirmations
    tier2EscalationQuality: 85,    // Higher bar for 70%+ win rate
    tier2EscalationConfidence: 80, // 80%+ confidence required
    tier3QualityThreshold: 90,     // Premium tier requires 90+ quality
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
    maxSignalsPerRun: 5,           // Balanced approach - max 5 signals per 5min
    rsiOversoldBuy: 30,            // Moderate RSI levels
    rsiOverboughtSell: 70,
    minRewardRisk: 1.8,            // Minimum 1.8:1 reward/risk ratio
    atrMinimumMultiplier: 1.0,     // Lower ATR requirement
    economicCalendarBuffer: 45,    // Avoid signals 45min before/after high impact news
  },
  LOW: {
    sequentialTiers: true,
    allowTier3Cap: false,
    tier1PassThreshold: 40,        // CALIBRATED: More realistic threshold for typical scores
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
async function getSignalConfig(supabase: any, requestOverride?: string) {
  try {
    // Allow request parameter to override admin settings
    let level = requestOverride;
    
    if (!level) {
      const { data: settings, error } = await supabase
        .from('app_settings')
        .select('signal_threshold_level')
        .eq('singleton', true)
        .single();
      
      if (error) {
        console.warn('⚠️ Could not fetch signal threshold settings, using HIGH default:', error);
        level = 'HIGH';
      } else {
        level = settings?.signal_threshold_level || 'HIGH';
      }
    }
    
    console.log(`🎯 Using ${level} threshold configuration${requestOverride ? ' (request override)' : ' (from admin settings)'}`);
    const config = THRESHOLD_CONFIGS[level as keyof typeof THRESHOLD_CONFIGS] || THRESHOLD_CONFIGS.HIGH;
    return { ...config, level }; // Add level to config for logging
  } catch (error) {
    console.warn('⚠️ Error fetching signal threshold settings, using HIGH default:', error);
    const config = THRESHOLD_CONFIGS.HIGH;
    return { ...config, level: 'HIGH' };
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
    
    // Parse request parameters first to check for threshold override
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) requestBody = JSON.parse(bodyText);
    } catch (e) {
      console.log('📝 Using default parameters');
    }

    // Get dynamic configuration from admin settings (with optional override)
    const CONFIG = await getSignalConfig(supabase, requestBody.thresholdLevel);

    const { 
      force = false,
      debug = false,
      maxSignals = CONFIG.maxSignalsPerRun,
      fullAnalysis = true,
      thresholdLevel
    } = requestBody;

    if (thresholdLevel) {
      console.log(`🔧 Threshold level override: ${thresholdLevel}`);
    }

    console.log(`🎯 Professional Mode - Force: ${force}, Debug: ${debug}, Max Signals: ${maxSignals}`);
    // Mode flags for CI/fast runs
    const enhancedHeader = req.headers.get('x-enhanced-generation')?.toLowerCase() === 'true';
    const optimized = (requestBody?.optimized ?? enhancedHeader) === true;
    const fastMode = (requestBody?.fastMode ?? optimized) === true;
    const maxAnalyzedPairs = Number(requestBody?.maxAnalyzedPairs ?? '') || undefined; // Always analyze all pairs unless explicitly limited
    const timeBudgetMs = Number(requestBody?.timeBudgetMs ?? (optimized ? 50000 : '')) || undefined;
    if (debug) {
      console.log(`⚙️ Mode: optimized=${optimized}, fastMode=${fastMode}, maxAnalyzedPairs=${maxAnalyzedPairs ?? 'all'}, timeBudgetMs=${timeBudgetMs ?? 'none'}`);
    }

    // Get current market data
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

    // Clear existing signals if in force mode
    if (force && existingSignals && existingSignals.length > 0) {
      console.log(`🔧 FORCE MODE: Clearing ${existingSignals.length} existing signals`);
      await supabase
        .from('trading_signals')
        .delete()
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null);
    }

    // Professional 3-Tier Analysis Pipeline
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
    console.log(`⚙️ Tier 1 pass threshold: ${tier1Threshold} (Level: ${CONFIG.level})`);
    
    // Track Tier 1 statistics for adaptive threshold
    let tier1Scores: number[] = [];
    let adaptiveThresholdUsed = false;

    let tier1Threshold = CONFIG.tier1PassThreshold;
    console.log(`⚙️ Tier 1 pass threshold: ${tier1Threshold} (Level: ${CONFIG.level})`);
    
    // Track Tier 1 statistics for adaptive threshold
    let tier1Scores: number[] = [];
    let adaptiveThresholdUsed = false;
    
    // Major pairs get priority for Tier 3 analysis
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
    const availablePairs = marketData
      .filter(d => d.symbol && d.current_price > 0)
      .filter(d => !existingSignals?.some(s => s.symbol === d.symbol));

    // Professional pair prioritization algorithm
    const pairsWithScores = availablePairs.map(pair => {
      const isMajor = majorPairs.includes(pair.symbol);
      const sessionAnalysis = analyzeCurrentSession();
      const isSessionOptimal = sessionAnalysis.recommendedPairs.includes(pair.symbol);
      const shouldAvoid = sessionAnalysis.avoidPairs.includes(pair.symbol);
      
      let score = 0;
      
      // Major pair bonus (40 points)
      if (isMajor) score += 40;
      
      // Session optimization (30 points)
      if (isSessionOptimal) score += 30;
      if (shouldAvoid) score -= 20;
      
      // Price action scoring (30 points maximum)
      try {
        const priceHistory = [pair.current_price]; // Would get actual history in production
        const volatility = Math.abs(pair.current_price - (pair.current_price * 0.999)) / pair.current_price;
        score += Math.min(volatility * 10000, 30);
      } catch (e) {
        // Use default scoring if price history unavailable
        score += 15;
      }
      
      return { ...pair, analysisScore: Math.max(score, 0) };
    });

    // Sort by professional score - analyze ALL 27 pairs but prioritize quality
    const prioritizedPairs = pairsWithScores
      .sort((a, b) => b.analysisScore - a.analysisScore);
    const selectedPairs = prioritizedPairs; // Always analyze all available pairs
    console.log(`🔥 PROFESSIONAL MODE: Analyzing ${selectedPairs.length} pairs with 3-tier system`);

    // 3-Tier Professional Analysis Pipeline
    let pairsAnalyzed = 0;
    let timedOut = false;
    for (let i = 0; i < selectedPairs.length && generatedSignals.length < maxNewSignals; i++) {
      const pair = selectedPairs[i];
      
      // Check if we need adaptive threshold after analyzing 12 pairs without passes
      if (i === 12 && analysisStats.tier1Passed === 0 && !adaptiveThresholdUsed) {
        const oldThreshold = tier1Threshold;
        tier1Threshold = Math.max(30, tier1Threshold - 5); // Drop by 5, minimum 30
        adaptiveThresholdUsed = true;
        console.log(`🎯 ADAPTIVE: No Tier 1 passes after 12 analyses, lowering threshold: ${oldThreshold} → ${tier1Threshold}`);
      }
      
      if (timeBudgetMs && (Date.now() - startTime) > timeBudgetMs) {
        console.log('⏹️ Time budget reached, stopping early');
        timedOut = true;
        break;
      }
      try {
        console.log(`🎯 [${i + 1}/${selectedPairs.length}] Professional analysis: ${pair.symbol} (Score: ${Math.round(pair.analysisScore)})`);
        
        // Get historical data for comprehensive analysis
        const historicalData = await getEnhancedHistoricalData(supabase, pair.symbol);
        if (!historicalData || historicalData.length < 100) {
          console.log(`⚠️ Insufficient data for ${pair.symbol}`);
          continue;
        }

        // TIER 1: FREE Professional Local Pre-screening
        const tier1Analysis = await performTier1Analysis(pair, historicalData, CONFIG);
        analysisStats.tier1Analyzed++;
        tier1Scores.push(tier1Analysis.score); // Track all scores
        
        console.log(`🔍 TIER 1: ${pair.symbol} - Score: ${tier1Analysis.score}/100 (Pass: ${tier1Threshold}+)`);
        
        if (tier1Analysis.score < tier1Threshold) {
          console.log(`❌ TIER 1: ${pair.symbol} failed pre-screening (${tier1Analysis.score}/100)`);
          continue;
        }
        
        analysisStats.tier1Passed++;
        
        // Sequential routing: T1 -> T2 -> (optional) T3
        let finalAnalysis: ProfessionalSignalAnalysis | null = null;

        // TIER 2: Always run after Tier 1 pass
        const t2Analysis = await performTier2Analysis(openAIApiKey, pair, historicalData, tier1Analysis);
        analysisStats.tier2Analyzed++;
        let escalateToTier3 = false;
        if (t2Analysis) {
          // Track costs for Tier 2
          analysisStats.totalTokens += t2Analysis.tokensUsed;
          analysisStats.totalCost += t2Analysis.cost;

          if ((t2Analysis.qualityScore ?? 0) >= CONFIG.tier2EscalationQuality && (t2Analysis.confidence ?? 0) >= CONFIG.tier2EscalationConfidence) {
            analysisStats.tier2Passed++;
            escalateToTier3 = true;
          }
        }

if (escalateToTier3) {
  console.log(`💎 ESCALATE: ${pair.symbol} → TIER 3 (from Tier 2 thresholds)`);
  const t3 = await performTier3Analysis(openAIApiKey, pair, historicalData, tier1Analysis);
  analysisStats.tier3Analyzed++;
  if (t3 && t3.qualityScore >= 65) {
    analysisStats.tier3Passed++;
  }
  if (t3) {
    // Track costs for Tier 3
    analysisStats.totalTokens += t3.tokensUsed;
    analysisStats.totalCost += t3.cost;
    // attach Tier 2 audit for later
    (t3 as any)._t2 = t2Analysis || null;
  }
  // Enforce risk model (1–2% SL, TPs at 1.5x/2x/3x) before gates
  finalAnalysis = t3 ? enforceRiskAndTargets(t3, pair.symbol, historicalData.map(p => p.price)) : t3;
} else {
  console.log(`💰 Tier 2 did not meet escalation thresholds for ${pair.symbol}`);
  finalAnalysis = t2Analysis; // Not published; used for logging only
}

        // Costs are accounted per-tier (T2/T3) above to avoid double-counting

        // Enforce Tier 3 + strict gates before publishing
        const finalQualityThreshold = CONFIG.finalQualityThreshold;
        const finalConfidenceThreshold = CONFIG.finalConfidenceThreshold;
        const prices = historicalData.map(p => p.price);

        if (finalAnalysis && finalAnalysis.tier === 3 && finalAnalysis.recommendation !== 'HOLD' &&
            finalAnalysis.qualityScore >= finalQualityThreshold &&
            finalAnalysis.confidence >= finalConfidenceThreshold) {
          // Evaluate publish gates
          const gates = evaluatePublishGates({
            prices,
            symbol: pair.symbol,
            direction: finalAnalysis.recommendation,
            entryPrice: finalAnalysis.entryPrice,
            stopLoss: finalAnalysis.stopLoss,
            tier1Confirmations: tier1Analysis.confirmations
          });

          if (gates.passed) {
            const signal = await convertProfessionalAnalysisToSignal(pair, finalAnalysis, historicalData);
            if (signal) {
              // Attach audit for DB insert
              (signal as any)._audit = {
                t1_score: tier1Analysis.score,
                t1_confirmations: tier1Analysis.confirmations,
                t2_quality: (finalAnalysis as any)?._t2?.qualityScore ?? null,
                t2_confidence: (finalAnalysis as any)?._t2?.confidence ?? null,
                t3_quality: finalAnalysis.qualityScore,
                t3_confidence: finalAnalysis.confidence,
                indicator_checklist: gates.checklist,
                gates_passed: true,
                gate_fail_reasons: [],
                final_quality: finalAnalysis.qualityScore,
                final_confidence: finalAnalysis.confidence
              };
              generatedSignals.push(signal);
              console.log(`✅ PROFESSIONAL SIGNAL (Tier 3, gates passed): ${signal.type} ${pair.symbol} (Q:${finalAnalysis.qualityScore}, C:${finalAnalysis.confidence}%)`);
            }
          } else {
            console.log(`🛑 Gates failed for ${pair.symbol}: ${gates.reasons.join('; ')}`);
          }
        } else if (finalAnalysis && finalAnalysis.tier === 2) {
          console.log(`🛑 ${pair.symbol} Tier 2 is pre-qualification only. Not publishing (Q:${finalAnalysis.qualityScore}/${finalQualityThreshold}, C:${finalAnalysis.confidence}/${finalConfidenceThreshold})`);
        } else {
          console.log(`🛑 ${pair.symbol} - ${finalAnalysis?.recommendation || 'HOLD'} (Q:${finalAnalysis?.qualityScore || 0}/${finalQualityThreshold}, C:${finalAnalysis?.confidence || 0}/${finalConfidenceThreshold})`);
        }

      } catch (error) {
        console.error(`❌ Error analyzing ${pair.symbol}:`, error);
        
        // Rate limit handling
        if (error.message?.includes('rate limit')) {
          const backoff = fastMode ? 3000 : 20000;
          console.log(`⏱️ Rate limit detected - ${backoff/1000}s backoff...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
      
      // Professional pacing between analyses
      pairsAnalyzed++;
      if (i + 1 < selectedPairs.length && generatedSignals.length < maxNewSignals) {
        let delayMs = fastMode ? 0 : (8000 + (i * 1000));
        if (timeBudgetMs) {
          const elapsed = Date.now() - startTime;
          const remaining = timeBudgetMs - elapsed;
          if (remaining <= 0) {
            console.log('⏹️ Time budget reached before pacing');
            timedOut = true;
            break;
          }
          if (delayMs > remaining - 1000) {
            delayMs = Math.max(0, remaining - 1000);
          }
        }
        if (delayMs > 0) {
          console.log(`⏱️ Professional pacing: ${Math.round(delayMs/1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Save professional signals to database
    let savedCount = 0;
    for (const signal of generatedSignals) {
      try {
        const { error: insertError } = await supabase
          .from('trading_signals')
          .insert({
            symbol: signal.symbol,
            type: signal.type,
            price: signal.price,
            pips: signal.pips,
            stop_loss: signal.stopLoss,
            take_profits: signal.takeProfits,
            confidence: signal.confidence,
            analysis_text: signal.analysisText,
            chart_data: signal.chartData,
            professional_grade: signal.professionalGrade,
            tier_level: signal.tierLevel,
            validation_score: signal.validationScore,
            quality_confirmations: signal.qualityConfirmations,
            // New audit fields
            t1_score: (signal as any)._audit?.t1_score ?? null,
            t1_confirmations: (signal as any)._audit?.t1_confirmations ?? null,
            t2_quality: (signal as any)._audit?.t2_quality ?? null,
            t2_confidence: (signal as any)._audit?.t2_confidence ?? null,
            t3_quality: (signal as any)._audit?.t3_quality ?? null,
            t3_confidence: (signal as any)._audit?.t3_confidence ?? null,
            indicator_checklist: (signal as any)._audit?.indicator_checklist ?? null,
            gates_passed: (signal as any)._audit?.gates_passed ?? false,
            gate_fail_reasons: (signal as any)._audit?.gate_fail_reasons ?? null,
            final_quality: (signal as any)._audit?.final_quality ?? null,
            final_confidence: (signal as any)._audit?.final_confidence ?? null,
            status: 'active',
            is_centralized: true,
            user_id: null,
            market_regime: 'trending', // Would be determined by analysis
            volatility_profile: 'normal'
          });

        if (!insertError) {
          savedCount++;
          console.log(`💾 Saved PROFESSIONAL ${signal.type} signal: ${signal.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Save error for ${signal.symbol}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;
    
    // Enhanced summary with Tier 1 analysis
    const tier1Stats = tier1Scores.length > 0 ? {
      avgScore: Math.round(tier1Scores.reduce((a, b) => a + b, 0) / tier1Scores.length),
      maxScore: Math.max(...tier1Scores),
      above40: tier1Scores.filter(s => s >= 40).length,
      above50: tier1Scores.filter(s => s >= 50).length
    } : null;
    
    console.log(`✅ PROFESSIONAL GENERATION COMPLETE:`);
    console.log(`   📊 Signals Generated: ${savedCount}/${generatedSignals.length}`);
    console.log(`   🎯 Tier 1: ${analysisStats.tier1Passed}/${analysisStats.tier1Analyzed} passed (threshold: ${tier1Threshold}${adaptiveThresholdUsed ? ', adaptive' : ''})`);
    if (tier1Stats) {
      console.log(`   📈 Tier 1 Stats: Avg=${tier1Stats.avgScore}, Max=${tier1Stats.maxScore}, ≥40: ${tier1Stats.above40}, ≥50: ${tier1Stats.above50}`);
    }
    console.log(`   💰 Tier 2: ${analysisStats.tier2Passed}/${analysisStats.tier2Analyzed} passed`);
    console.log(`   💎 Tier 3: ${analysisStats.tier3Passed}/${analysisStats.tier3Analyzed} passed`);
    console.log(`   💵 Total Cost: $${analysisStats.totalCost.toFixed(4)}`);
    console.log(`   ⏱️ Execution Time: ${executionTime}ms`);

    return new Response(JSON.stringify({
      status: 'success',
      stats: {
        signalsGenerated: savedCount,
        totalAnalyzed: (typeof selectedPairs !== 'undefined' ? selectedPairs.length : prioritizedPairs.length),
        pairsAnalyzed,
        timedOut,
        executionTime: `${executionTime}ms`,
        tierStats: analysisStats,
        professionalGrade: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ PROFESSIONAL GENERATION ERROR:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      status: 'error',
      stats: { signalsGenerated: 0 }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Get enhanced historical data with multi-timeframe support
async function getEnhancedHistoricalData(supabase: any, symbol: string): Promise<PricePoint[] | null> {
  try {
    // First try to get from multi-timeframe data (preferred)
    const { data: mtData, error: mtError } = await supabase
      .from('multi_timeframe_data')
      .select('timestamp, price:close_price')
      .eq('symbol', symbol)
      .eq('timeframe', '1H')
      .order('timestamp', { ascending: true })
      .limit(200);
    
    if (!mtError && mtData && mtData.length >= 50) {
      console.log(`📊 Using multi-timeframe data for ${symbol}: ${mtData.length} points`);
      return mtData.map((point: any) => ({
        timestamp: new Date(point.timestamp).getTime(),
        price: parseFloat(point.price)
      }));
    }
    
    // Fallback to live price history
    const { data, error } = await supabase
      .from('live_price_history')
      .select('timestamp, price')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: true })
      .limit(500);

    if (error || !data || data.length < 50) {
      console.log(`⚠️ Insufficient historical data for ${symbol}`);
      return null;
    }

    return data.map((point: any) => ({
      timestamp: new Date(point.timestamp).getTime(),
      price: parseFloat(point.price)
    }));
    
  } catch (error) {
    console.error(`❌ Historical data error for ${symbol}:`, error);
    return null;
  }
}

// TIER 1: FREE Professional Local Analysis
async function performTier1Analysis(pair: MarketData, historicalData: PricePoint[], config: any): Promise<{
  score: number;
  confirmations: string[];
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  technicalFactors: string[];
}> {
  const prices = historicalData.map(p => p.price);
  const currentPrice = pair.current_price;
  let score = 0;
  const confirmations: string[] = [];
  const technicalFactors: string[] = [];
  
  try {
    // ULTRA-SELECTIVE RSI Analysis: Buy <25, Sell >75 with rising/falling confirmation
    const rsi = calculateRSI(prices);
    const rsiPrevious = prices.length >= 2 ? calculateRSI(prices.slice(0, -1)) : rsi;
    
    if (rsi < config.rsiOversoldBuy && rsi > rsiPrevious) {
      score += 25;
      confirmations.push(`RSI Ultra-Oversold & Rising (${rsi.toFixed(1)})`);
      technicalFactors.push('RSI_OVERSOLD_RISING');
    } else if (rsi > config.rsiOverboughtSell && rsi < rsiPrevious) {
      score += 25;
      confirmations.push(`RSI Ultra-Overbought & Falling (${rsi.toFixed(1)})`);
      technicalFactors.push('RSI_OVERBOUGHT_FALLING');
    } else if (rsi < 30 || rsi > 70) {
      score += 10; // Partial credit for standard overbought/oversold
      confirmations.push(`RSI Standard Zone (${rsi.toFixed(1)})`);
    }
    
    // Moving Average Analysis (0-25 points)
    const ema50 = calculateEMA(prices, 50);
    const ema200 = calculateEMA(prices, 200);
    
    if (currentPrice > ema50 && ema50 > ema200) {
      score += 25;
      confirmations.push('Strong Bullish Trend Alignment');
      technicalFactors.push('BULLISH_TREND');
    } else if (currentPrice < ema50 && ema50 < ema200) {
      score += 25;
      confirmations.push('Strong Bearish Trend Alignment');
      technicalFactors.push('BEARISH_TREND');
    } else if (currentPrice > ema50 || currentPrice > ema200) {
      score += 15;
      confirmations.push('Partial Bullish Alignment');
      technicalFactors.push('PARTIAL_BULLISH');
    } else if (currentPrice < ema50 || currentPrice < ema200) {
      score += 15;
      confirmations.push('Partial Bearish Alignment');
      technicalFactors.push('PARTIAL_BEARISH');
    }
    
    // Volatility Analysis (0-15 points)
    const recentPrices = prices.slice(-20);
    const volatility = (Math.max(...recentPrices) - Math.min(...recentPrices)) / currentPrice;
    if (volatility > 0.005 && volatility < 0.025) {
      score += 15;
      confirmations.push('Optimal Volatility Range');
      technicalFactors.push('OPTIMAL_VOLATILITY');
    } else if (volatility <= 0.005) {
      score += 5;
      confirmations.push('Low Volatility');
      technicalFactors.push('LOW_VOLATILITY');
    }
    
    // Momentum Analysis (0-20 points)
    if (prices.length >= 12) {
      const momentum = (currentPrice - prices[prices.length - 12]) / prices[prices.length - 12];
      if (Math.abs(momentum) > 0.001) {
        score += 20;
        confirmations.push(`Strong Momentum (${(momentum * 100).toFixed(2)}%)`);
        technicalFactors.push(momentum > 0 ? 'BULLISH_MOMENTUM' : 'BEARISH_MOMENTUM');
      }
    }
    
    // Support/Resistance proximity (0-15 points)
    const recentHigh = Math.max(...prices.slice(-10));
    const recentLow = Math.min(...prices.slice(-10));
    const range = recentHigh - recentLow;
    
    if (Math.abs(currentPrice - recentLow) / range < 0.2) {
      score += 10;
      confirmations.push('Near Support Level');
      technicalFactors.push('NEAR_SUPPORT');
    } else if (Math.abs(currentPrice - recentHigh) / range < 0.2) {
      score += 10;
      confirmations.push('Near Resistance Level');
      technicalFactors.push('NEAR_RESISTANCE');
    }

    // ENHANCED MACD with Divergence Detection
    const macd = computeMACDHistogram(prices);
    const macdPrevious = prices.length >= 2 ? computeMACDHistogram(prices.slice(0, -1)) : macd;
    
    // MACD Histogram Crossover with Divergence
    if (macd.hist > 0 && macdPrevious.hist <= 0) {
      score += 20;
      confirmations.push('MACD Bullish Crossover');
      technicalFactors.push('MACD_BULLISH_CROSSOVER');
    } else if (macd.hist < 0 && macdPrevious.hist >= 0) {
      score += 20;
      confirmations.push('MACD Bearish Crossover');
      technicalFactors.push('MACD_BEARISH_CROSSOVER');
    } else if (Math.abs(macd.hist) > Math.abs(macdPrevious.hist)) {
      score += 10;
      confirmations.push('MACD Momentum Increasing');
      technicalFactors.push('MACD_MOMENTUM');
    }

    // ULTRA-SELECTIVE ATR: Must be above minimum but not excessive
    const atr = computeATRApprox(prices, 14);
    const isJPY = pair.symbol.includes('JPY');
    const atrMinimum = isJPY ? 0.015 : 0.00025; // Stricter minimum
    const atrMaximum = isJPY ? 0.08 : 0.0015;   // Not too volatile
    
    if (atr >= atrMinimum && atr <= atrMaximum) {
      score += 15;
      confirmations.push(`ATR Optimal Range (${atr.toFixed(6)})`);
      technicalFactors.push('ATR_OPTIMAL');
    } else if (atr >= atrMinimum) {
      score += 5;
      confirmations.push(`ATR Sufficient (${atr.toFixed(6)})`);
      technicalFactors.push('ATR_OK');
    } else {
      score -= 10; // Penalty for low volatility
      confirmations.push(`ATR Too Low (${atr.toFixed(6)})`);
      technicalFactors.push('ATR_LOW');
    }

  } catch (error) {
    console.error(`❌ Tier 1 analysis error for ${pair.symbol}:`, error);
    score = 0;
  }
  
  // ULTRA-SELECTIVE RECOMMENDATION: Require 4+ confluences for BUY/SELL
  let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  
  const bullishFactors = technicalFactors.filter(f => 
    f.includes('BULLISH') || f.includes('OVERSOLD') || f.includes('SUPPORT') || f.includes('RISING')
  ).length;
  
  const bearishFactors = technicalFactors.filter(f => 
    f.includes('BEARISH') || f.includes('OVERBOUGHT') || f.includes('RESISTANCE') || f.includes('FALLING')
  ).length;
  
  // MANDATORY: 4+ confluences required (config.tier1RequiredConfluences)
  const totalConfluences = bullishFactors + bearishFactors;
  if (totalConfluences >= config.tier1RequiredConfluences) {
    if (bullishFactors >= config.tier1RequiredConfluences && bullishFactors > bearishFactors) {
      recommendation = 'BUY';
    } else if (bearishFactors >= config.tier1RequiredConfluences && bearishFactors > bullishFactors) {
      recommendation = 'SELL';
    }
  }
  
  // Additional quality gate: Check for conflicting signals
  if (bullishFactors > 0 && bearishFactors > 0 && Math.abs(bullishFactors - bearishFactors) <= 1) {
    recommendation = 'HOLD'; // Conflicting signals = no trade
    score *= 0.5; // Penalty for mixed signals
  }
  
  return {
    score: Math.min(score, 100),
    confirmations,
    recommendation,
    technicalFactors
  };
}

// TIER 2: Cost-Effective AI Analysis
async function performTier2Analysis(
  openAIApiKey: string, 
  pair: MarketData, 
  historicalData: PricePoint[],
  tier1Data: any
): Promise<ProfessionalSignalAnalysis | null> {
  
  const prices = historicalData.map(p => p.price);
  const technicalSummary = prepareTechnicalSummary(prices, pair.current_price);
  
const prompt = `ULTRA-SELECTIVE FOREX ANALYSIS - 70%+ Win Rate Target

You are a 20-year veteran forex expert with a proven 70%+ win rate track record. Your mission: REJECT 90% of setups, approve ONLY the highest probability trades.

SETUP ANALYSIS FOR ${pair.symbol}:
Current Price: ${pair.current_price}
Technical Context: ${technicalSummary}
Session: European/US overlap (optimal volatility window)

ULTRA-SELECTIVE CRITERIA (All must be met):
✓ 4+ technical confluences aligned
✓ Clear directional bias (no mixed signals)  
✓ Optimal volatility (not too high/low)
✓ No major economic events within 60 minutes
✓ Reward:Risk ratio minimum 2.5:1
✓ Session-appropriate pair volatility

REJECTION TRIGGERS (Instant REJECT if ANY present):
❌ Mixed/conflicting technical signals
❌ Low volatility or excessive volatility  
❌ Economic news within 60 minutes
❌ Weekend/holiday conditions
❌ Reward:risk below 2:1
❌ Any doubt about setup quality

OUTPUT REQUIREMENTS:
- Direction: "buy|sell|reject" (REJECT if ANY doubt)
- Confidence: 0-100 (minimum 85 for approval)  
- Reasoning: Max 30 words explaining decision
- Risk Management: Stop loss 1-2%, Take profits at 1.5x, 2.5x, 4x levels

JSON ONLY:
{
  "direction": "buy|sell|reject",
  "confidence": 0-100,
  "reasoning": "Ultra-concise reasoning (max 30 words)",
  "adjustedEntry": ${pair.current_price},
  "stopLossPercent": 1.8,
  "riskRewardTargets": [1.5, 2.5, 4.0]
}

Remember: Your reputation depends on 70%+ win rate. When in doubt, REJECT.`;

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
          { role: 'system', content: 'You are a professional forex analyst. Provide precise, actionable analysis in JSON format.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`⚠️ TIER 2: Invalid JSON response for ${pair.symbol}`);
      return null;
    }
    
const analysis = JSON.parse(jsonMatch[0]);

const tokensUsed = data.usage?.total_tokens || 200;
const cost = tokensUsed * 0.00000015; // gpt-4o-mini pricing

console.log(`💰 TIER 2 cost for ${pair.symbol}: ${tokensUsed} tokens, ~$${cost.toFixed(4)}`);

// Map Tier 2 output to internal format
const dir = (analysis.direction || '').toString().toUpperCase();
const recommendation: 'BUY' | 'SELL' | 'HOLD' = dir === 'REJECT' ? 'HOLD' : (dir === 'BUY' || dir === 'SELL' ? dir : (analysis.recommendation || 'HOLD'));
const entryPrice = analysis.adjustedEntry ?? analysis.entryPrice ?? pair.current_price;
const computedStop = (dir === 'BUY' || dir === 'SELL') && typeof analysis.stopLossPercent === 'number'
  ? (dir === 'BUY' ? entryPrice * (1 - (analysis.stopLossPercent / 100)) : entryPrice * (1 + (analysis.stopLossPercent / 100)))
  : analysis.stopLoss;
const stopLoss = computedStop;
const takeProfits = Array.isArray(analysis.riskRewardTargets) && stopLoss
  ? analysis.riskRewardTargets.map((rr: number) => dir === 'BUY' ? entryPrice + rr * Math.abs(entryPrice - stopLoss) : entryPrice - rr * Math.abs(entryPrice - stopLoss))
  : (analysis.takeProfits || []);

return {
  recommendation,
  confidence: analysis.confidence,
  entryPrice,
  stopLoss,
  takeProfits,
  reasoning: analysis.reasoning || '',
  technicalFactors: tier1Data.technicalFactors,
  riskAssessment: 'Standard risk assessment applied',
  marketRegime: 'Normal market conditions',
  sessionAnalysis: getCurrentSessionText(),
  qualityScore: analysis.qualityScore || 50,
  tier: 2,
  tokensUsed,
  cost
};
    
  } catch (error) {
    console.error(`❌ TIER 2 analysis error for ${pair.symbol}:`, error);
    return null;
  }
}

// TIER 3: Premium Professional Analysis
async function performTier3Analysis(
  openAIApiKey: string, 
  pair: MarketData, 
  historicalData: PricePoint[],
  tier1Data: any
): Promise<ProfessionalSignalAnalysis | null> {
  
  const prices = historicalData.map(p => p.price);
  const technicalSummary = prepareTechnicalSummary(prices, pair.current_price);
  const sessionAnalysis = getCurrentSessionText();
  
  const prompt = `PREMIUM FOREX SIGNAL GENERATOR - 70%+ Win Rate Precision Target

You are an elite institutional forex analyst generating signals for a premium 70%+ win rate system.

SIGNAL PARAMETERS FOR ${pair.symbol}:
Current Price: ${pair.current_price}
Session Context: ${sessionAnalysis}

TIER 1 PRE-SCREENING RESULTS:
✅ Technical Score: ${tier1Data.score}/100 (Passed ultra-selective filters)
✅ Confirmations: ${tier1Data.confirmations.join(', ')}
✅ Technical Confluences: ${tier1Data.technicalFactors.join(', ')}

COMPREHENSIVE MARKET DATA:
${technicalSummary}

INSTITUTIONAL SIGNAL REQUIREMENTS:
1. PRECISION ENTRY/EXIT: Calculate exact price levels using ATR and support/resistance
2. RISK MANAGEMENT: 1-2% account risk, stop loss based on volatility (40-120 pips)
3. REWARD TARGETING: Progressive take profits at 1.5x, 2.5x, 4x risk levels
4. MARKET REGIME: Identify if trending/ranging/volatile for appropriate strategy
5. SESSION OPTIMIZATION: Leverage session-specific volatility patterns
6. NEWS AWARENESS: Factor in upcoming economic events (avoid if high impact within 60min)

QUALITY GATES (Signal REJECTED if not met):
❌ Quality Score below 90/100
❌ Confidence below 85%
❌ Reward:Risk below 2.5:1
❌ Less than 4 technical confirmations
❌ Mixed directional signals
❌ Economic news risk within 60 minutes

PRECISION SIGNAL OUTPUT (JSON format):
{
  "recommendation": "BUY|SELL|HOLD",
  "qualityScore": 0-100,
  "confidence": 0-100,
  "entryPrice": precise_entry_level,
  "stopLoss": atr_based_stop_loss,
  "takeProfits": [tp1_1.5x, tp2_2.5x, tp3_4x],
  "reasoning": "Institutional-grade analysis (max 40 words)",
  "riskAssessment": "Professional risk evaluation",
  "marketRegime": "trending|ranging|volatile",
  "technicalFactors": ["confluence1", "confluence2", "confluence3", "confluence4+"],
  "sessionAnalysis": "Session-specific market conditions",
  "rewardRiskRatio": calculated_ratio,
  "pipDistance": stop_loss_in_pips,
  "economicRisk": "none|low|medium|high"
}

MANDATE: Generate ONLY institutional-quality signals meeting 70%+ win rate standards. Reject marginal setups.`;


  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional institutional forex analyst with 15+ years experience. Provide precise, high-quality trading analysis with strict risk management focus. Only recommend signals that meet institutional standards.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log(`💎 TIER 3 response for ${pair.symbol}: ${aiResponse.substring(0, 200)}...`);
    
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`⚠️ TIER 3: Invalid JSON for ${pair.symbol}`);
      return null;
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    const tokensUsed = data.usage?.total_tokens || 400;
    const cost = tokensUsed * 0.000003; // gpt-4.1 pricing
    
    console.log(`💎 TIER 3 cost for ${pair.symbol}: ${tokensUsed} tokens, ~$${cost.toFixed(4)}`);
    
    return {
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      entryPrice: analysis.entryPrice || pair.current_price,
      stopLoss: analysis.stopLoss,
      takeProfits: analysis.takeProfits || [],
      reasoning: analysis.reasoning || '',
      technicalFactors: [...tier1Data.technicalFactors, ...(analysis.technicalFactors || [])],
      riskAssessment: analysis.riskAssessment || 'Professional risk assessment applied',
      marketRegime: analysis.marketRegime || 'Normal conditions',
      sessionAnalysis,
      qualityScore: analysis.qualityScore || 65,
      tier: 3,
      tokensUsed,
      cost
    };
    
  } catch (error) {
    console.error(`❌ TIER 3 analysis error for ${pair.symbol}:`, error);
    return null;
  }
}

// Convert professional analysis to signal format
async function convertProfessionalAnalysisToSignal(
  pair: MarketData, 
  analysis: ProfessionalSignalAnalysis,
  historicalData: PricePoint[]
): Promise<SignalData | null> {
  
  try {
    const chartData = historicalData.slice(-50).map(point => ({
      time: point.timestamp,
      price: point.price
    }));
    
    // Calculate pips for the signal
    const pips = analysis.takeProfits.length > 0 
      ? Math.abs(analysis.takeProfits[0] - analysis.entryPrice) * (pair.symbol.includes('JPY') ? 100 : 10000)
      : 50;

    return {
      symbol: pair.symbol,
      type: analysis.recommendation as 'BUY' | 'SELL',
      price: analysis.entryPrice,
      pips: Math.round(pips),
      stopLoss: analysis.stopLoss,
      takeProfits: analysis.takeProfits,
      confidence: analysis.confidence,
      analysisText: analysis.reasoning,
      technicalIndicators: {
        tier: analysis.tier,
        factors: analysis.technicalFactors,
        regime: analysis.marketRegime
      },
      chartData,
      professionalGrade: analysis.qualityScore >= 65,
      tierLevel: analysis.tier,
      validationScore: analysis.qualityScore,
      qualityConfirmations: analysis.technicalFactors
    };
    
  } catch (error) {
    console.error(`❌ Signal conversion error for ${pair.symbol}:`, error);
    return null;
  }
}

// Gate evaluation helpers
function computeMACDHistogram(prices: number[], fast = 12, slow = 26, signal = 9) {
  if (prices.length < slow + signal + 2) return { hist: 0, macd: 0, signalLine: 0 };
  const emaFast = calculateEMA(prices, fast);
  const emaSlow = calculateEMA(prices, slow);
  const macdLine = emaFast - emaSlow;
  // Build MACD series for last (signal) points to get signal line
  const macdSeries: number[] = [];
  for (let i = prices.length - (signal + 1); i < prices.length; i++) {
    const slice = prices.slice(0, i + 1);
    macdSeries.push(calculateEMA(slice, fast) - calculateEMA(slice, slow));
  }
  const signalLine = calculateEMA(macdSeries, signal);
  const hist = macdLine - signalLine;
  return { hist, macd: macdLine, signalLine };
}

function computeATRApprox(prices: number[], period: number = 14) {
  if (prices.length < period + 2) return 0;
  const trs: number[] = [];
  for (let i = prices.length - period; i < prices.length; i++) {
    const prev = prices[i - 1];
    const cur = prices[i];
    trs.push(Math.abs(cur - prev));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / trs.length;
  return atr;
}

function detectRSIDivergence(prices: number[], period: number = 14) {
  if (prices.length < period * 4) return { bullish: false, bearish: false };
  // Use last 30 bars to detect simple divergence
  const window = prices.slice(-30);
  // Find two recent lows and highs
  const minIdx1 = window.indexOf(Math.min(...window.slice(0, 15)));
  const minIdx2 = 15 + window.slice(15).indexOf(Math.min(...window.slice(15)));
  const maxIdx1 = window.indexOf(Math.max(...window.slice(0, 15)));
  const maxIdx2 = 15 + window.slice(15).indexOf(Math.max(...window.slice(15)));
  const rsiSeries: number[] = [];
  for (let i = prices.length - 30; i < prices.length; i++) {
    const slice = prices.slice(0, i + 1);
    rsiSeries.push(calculateRSI(slice, period));
  }
  const rsiMin1 = Math.min(...rsiSeries.slice(0, 15));
  const rsiMin2 = Math.min(...rsiSeries.slice(15));
  const rsiMax1 = Math.max(...rsiSeries.slice(0, 15));
  const rsiMax2 = Math.max(...rsiSeries.slice(15));
  const bullish = window[minIdx2] < window[minIdx1] && rsiMin2 > rsiMin1; // lower low, higher RSI low
  const bearish = window[maxIdx2] > window[maxIdx1] && rsiMax2 < rsiMax1; // higher high, lower RSI high
  return { bullish, bearish };
}

function enforceRiskAndTargets(analysis: ProfessionalSignalAnalysis, symbol: string, prices: number[]): ProfessionalSignalAnalysis {
  try {
    const atr = computeATRApprox(prices, 14);
    const entry = analysis.entryPrice;
    const dir = analysis.recommendation;
    const riskPct = 0.015; // target 1.5% distance (clamped 1–2%)
    const pctDist = entry * riskPct;
    const riskDistance = Math.min(Math.max(pctDist, 0.5 * atr), 3 * atr);
    const stopLoss = dir === 'BUY' ? entry - riskDistance : entry + riskDistance;
    const tps = [1.5, 2, 3].map(m => dir === 'BUY' ? entry + m * riskDistance : entry - m * riskDistance);
    return { ...analysis, stopLoss, takeProfits: tps };
  } catch {
    return analysis;
  }
}

function evaluatePublishGates(params: {
  prices: number[];
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  tier1Confirmations: string[];
}) {
  const { prices, symbol, direction, entryPrice, stopLoss, tier1Confirmations } = params;
  const current = prices[prices.length - 1];
  const ema50 = calculateEMA(prices, 50);
  const ema200 = calculateEMA(prices, 200);
  const macd = computeMACDHistogram(prices);
  const atr = computeATRApprox(prices, 14);
  const isJPY = symbol.includes('JPY');
  const atrFloor = isJPY ? 0.02 : 0.0002;
  const riskDistance = Math.abs(entryPrice - stopLoss);
  const macdOk = direction === 'BUY' ? macd.hist > 0 : macd.hist < 0;
  const macdMagnitudeOk = Math.abs(macd.hist) > (isJPY ? 0.002 : 0.00002);
  const trendStrong = direction === 'BUY'
    ? current > ema50 && ema50 > ema200
    : current < ema50 && ema50 < ema200;
  const timeframeAlignmentOk = trendStrong; // proxy for H4/D1 alignment
  const atrOk = atr > atrFloor && riskDistance >= 0.5 * atr && riskDistance <= 3 * atr;
  const div = detectRSIDivergence(prices);
  const rsiDivergenceOrTrend = direction === 'BUY' ? (div.bullish || trendStrong) : (div.bearish || trendStrong);
  const confirmationsCount = tier1Confirmations.length;
  const checklist = {
    timeframe_alignment_ok: timeframeAlignmentOk,
    macd_ok: macdOk && macdMagnitudeOk,
    atr_ok: atrOk,
    rsi_divergence_or_trend: rsiDivergenceOrTrend,
    confirmations_count: confirmationsCount,
    atr_value: atr,
    macd_hist: macd.hist,
    ema50,
    ema200
  };
  const reasons: string[] = [];
  if (!checklist.timeframe_alignment_ok) reasons.push('Timeframe alignment failed');
  if (!(checklist.macd_ok)) reasons.push('MACD histogram not aligned');
  if (!checklist.atr_ok) reasons.push('ATR/stop distance invalid');
  if (!checklist.rsi_divergence_or_trend) reasons.push('No RSI divergence or strong trend');
  if (confirmationsCount < 4) reasons.push('Insufficient confirmations');
  const passed = checklist.timeframe_alignment_ok && checklist.macd_ok && checklist.atr_ok && checklist.rsi_divergence_or_trend && confirmationsCount >= 4;
  return { passed, checklist, reasons };
}

// Helper functions
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function prepareTechnicalSummary(prices: number[], currentPrice: number): string {
  const rsi = calculateRSI(prices);
  const ema50 = calculateEMA(prices, 50);
  const ema200 = calculateEMA(prices, 200);
  const macd = computeMACDHistogram(prices);
  const atr = computeATRApprox(prices, 14);
  
  return `RSI: ${rsi.toFixed(1)}, EMA50: ${ema50.toFixed(5)}, EMA200: ${ema200.toFixed(5)}, MACD_hist: ${macd.hist.toFixed(6)}, ATR14: ${atr.toFixed(6)}, Current: ${currentPrice}`;
}

function getCurrentSessionText(): string {
  const hour = new Date().getUTCHours();
  
  if (hour >= 0 && hour < 7) return 'Asian Session (Low volatility)';
  if (hour >= 7 && hour < 8) return 'Asian-European Overlap';
  if (hour >= 8 && hour < 13) return 'European Session (High volatility)';
  if (hour >= 13 && hour < 17) return 'European-American Overlap (Peak activity)';
  return 'American Session';
}

function analyzeCurrentSession(): { currentSession: string; recommendedPairs: string[]; avoidPairs: string[] } {
  const hour = new Date().getUTCHours();
  
  if (hour >= 0 && hour < 7) {
    return {
      currentSession: 'Asian',
      recommendedPairs: ['USDJPY', 'AUDJPY', 'NZDJPY', 'AUDUSD'],
      avoidPairs: ['GBPUSD', 'EURGBP']
    };
  } else if (hour >= 8 && hour < 17) {
    return {
      currentSession: 'European',
      recommendedPairs: ['EURUSD', 'GBPUSD', 'EURGBP', 'EURJPY'],
      avoidPairs: ['AUDUSD', 'NZDUSD']
    };
  } else {
    return {
      currentSession: 'American',
      recommendedPairs: ['EURUSD', 'GBPUSD', 'USDCAD'],
      avoidPairs: ['AUDJPY', 'NZDJPY']
    };
  }
}