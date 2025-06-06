import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum number of active signals allowed
const MAX_ACTIVE_SIGNALS = 20;

// Pip calculation utilities for the edge function
const isJPYPair = (symbol: string): boolean => {
  return symbol.includes('JPY');
};

const getPipValue = (symbol: string): number => {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
};

// Improved stop loss calculation with minimum 45-50 pip distance and technical levels
const calculateRealisticStopLoss = (entryPrice: number, symbol: string, signalType: string, pipDistance: number): number => {
  // Ensure minimum distance of 45 pips for non-JPY pairs, 50 for JPY pairs
  let minimumPips = isJPYPair(symbol) ? 50 : 45;
  pipDistance = Math.max(pipDistance, minimumPips);
  
  const pipValue = getPipValue(symbol);
  const stopLossDistance = pipDistance * pipValue;
  
  return signalType === 'BUY' 
    ? entryPrice - stopLossDistance 
    : entryPrice + stopLossDistance;
};

// Improved take profit calculation with focus on risk-reward ratio
const calculateRealisticTakeProfit = (entryPrice: number, symbol: string, signalType: string, pipDistance: number): number => {
  const pipValue = getPipValue(symbol);
  const takeProfitDistance = pipDistance * pipValue;
  
  return signalType === 'BUY' 
    ? entryPrice + takeProfitDistance 
    : entryPrice - takeProfitDistance;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    const targetPair = body.symbol;
    
    console.log(`🎯 ${isCronTriggered ? 'CRON AUTOMATIC' : 'MANUAL'} ENHANCED signal generation starting...`);
    console.log(`🎯 Target pair: ${targetPair || 'Auto-detect HIGH-SUCCESS opportunities'}`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log(`🛡️ MODE: ENHANCED SUCCESS-FOCUSED - MAX ${MAX_ACTIVE_SIGNALS} SIGNALS`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔍 Environment check:');
    console.log(`  - Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - OpenAI Key: ${openAIApiKey ? '✅ Set (length: ' + (openAIApiKey?.length || 0) + ')' : '❌ Missing'}`);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    if (!openAIApiKey) {
      console.error('❌ CRITICAL: OpenAI API key not configured');
      throw new Error('OpenAI API key not configured - required for AI signal generation');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check existing active signals
    console.log(`🔍 Checking existing active signals (limit: ${MAX_ACTIVE_SIGNALS})...`);
    const { data: existingSignals, error: existingError } = await supabase
      .from('trading_signals')
      .select('symbol')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active');

    if (existingError) {
      console.error('❌ Error checking existing signals:', existingError);
      throw existingError;
    }

    const existingPairs = new Set(existingSignals?.map(s => s.symbol) || []);
    const currentSignalCount = existingPairs.size;
    
    console.log(`📊 Current active signals: ${currentSignalCount}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`📝 Existing pairs: [${Array.from(existingPairs).join(', ')}]`);

    if (currentSignalCount >= MAX_ACTIVE_SIGNALS) {
      console.log(`🚫 Signal limit reached (${currentSignalCount}/${MAX_ACTIVE_SIGNALS}) - no new signals will be generated`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Signal limit reached (${currentSignalCount}/${MAX_ACTIVE_SIGNALS}) - no new signals generated`, 
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            generationRate: '0%',
            existingSignals: currentSignalCount,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            limitReached: true,
            enhancedMode: true,
            targetSuccessRate: '70%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxNewSignals = MAX_ACTIVE_SIGNALS - currentSignalCount;
    console.log(`✅ Can generate up to ${maxNewSignals} new HIGH-SUCCESS signals`);

    // Market data validation
    console.log('📈 Validating centralized market data freshness...');
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(50);

    if (marketError) {
      console.error('❌ Error fetching centralized market data:', marketError);
      throw marketError;
    }

    console.log(`💾 Found ${marketData?.length || 0} market data points`);

    // Enhanced currency pairs list
    const allCurrencyPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
      'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
      'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY', 'GBPAUD', 'EURCAD'
    ];
    
    console.log(`🌍 ENHANCED COVERAGE: Analyzing ${allCurrencyPairs.length} currency pairs for high-success opportunities`);
    
    const availablePairs = targetPair 
      ? (existingPairs.has(targetPair) ? [] : [targetPair])
      : allCurrencyPairs.filter(pair => !existingPairs.has(pair));
    
    const prioritizedPairs = availablePairs.slice(0, maxNewSignals);
    
    console.log(`🔍 Available pairs for NEW HIGH-SUCCESS signals: ${prioritizedPairs.length} (limited to ${maxNewSignals})`);
    console.log(`📝 Will analyze: [${prioritizedPairs.join(', ')}]`);
    
    if (prioritizedPairs.length === 0) {
      console.log(`✅ Signal limit reached (${currentSignalCount}/${MAX_ACTIVE_SIGNALS}) - no new opportunities available`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Signal limit reached (${currentSignalCount}/${MAX_ACTIVE_SIGNALS}) - no new opportunities available`, 
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            generationRate: '0%',
            existingSignals: currentSignalCount,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            limitReached: true,
            enhancedMode: true,
            targetSuccessRate: '70%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get latest price for available currency pairs
    const latestPrices = new Map();
    
    for (const pair of prioritizedPairs) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
        console.log(`📊 Found centralized data for ${pair}: ${pairData.current_price} (updated: ${pairData.last_update})`);
      } else {
        console.log(`⚠️ No market data found for ${pair}`);
      }
    }

    console.log(`🎯 Will analyze ${latestPrices.size} pairs for NEW HIGH-SUCCESS signal opportunities (limit: ${maxNewSignals})`);

    if (latestPrices.size === 0) {
      console.log('⚠️ No market data available for new signal generation');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No market data available for new signal generation', 
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            generationRate: '0%',
            existingSignals: currentSignalCount,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            limitReached: false,
            enhancedMode: true,
            targetSuccessRate: '70%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = new Date().toISOString();
    let signalsGenerated = 0;
    let opportunitiesAnalyzed = 0;
    const generatedSignals = [];

    console.log(`🚀 Starting ENHANCED BALANCED AI analysis for ${prioritizedPairs.length} NEW pairs...`);

    // Analyze pairs individually with improved volatility-aware risk management
    for (const pair of prioritizedPairs) {
      if (signalsGenerated >= maxNewSignals) {
        console.log(`🚫 Reached new signal limit (${signalsGenerated}/${maxNewSignals}) - stopping generation`);
        break;
      }

      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) {
        console.log(`⚠️ Skipping ${pair} - no market data available`);
        continue;
      }

      try {
        opportunitiesAnalyzed++;
        const currentPrice = parseFloat(marketPoint.current_price.toString());
        
        console.log(`🧠 ENHANCED BALANCED analysis of ${pair} at price ${currentPrice} (${signalsGenerated + 1}/${maxNewSignals})...`);

        // Get extended historical price data for enhanced analysis & volatility calculation
        const { data: historicalData } = await supabase
          .from('centralized_market_state')
          .select('current_price, last_update')
          .eq('symbol', pair)
          .order('last_update', { ascending: false })
          .limit(100); // More data for better analysis

        const priceHistory = historicalData?.map(d => parseFloat(d.current_price.toString())).slice(0, 50) || [currentPrice];
        const priceChange = priceHistory.length > 1 ? 
          ((currentPrice - priceHistory[priceHistory.length - 1]) / priceHistory[priceHistory.length - 1] * 100) : 0;

        // Calculate price volatility for dynamic stop loss sizing
        const priceChanges = priceHistory.slice(0, -1).map((price, i) => {
          if (i < priceHistory.length - 1) {
            return (price - priceHistory[i + 1]) / priceHistory[i + 1] * 100;
          }
          return 0;
        }).filter(change => change !== 0);

        const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / Math.max(priceChanges.length, 1);
        const priceVolatility = Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change - avgPriceChange, 2), 0) / Math.max(priceChanges.length, 1));

        // ENHANCED: Calculate dynamic stop loss based on volatility
        // Higher volatility = wider stop loss to avoid premature stops
        const baseStopPips = isJPYPair(pair) ? 55 : 50; // Increased minimum SL distance
        const volatilityFactor = Math.min(Math.max(priceVolatility * 10, 1), 1.5); // Scale factor between 1-1.5x
        const dynamicStopPips = Math.round(baseStopPips * volatilityFactor);
        
        console.log(`📊 VOLATILITY ANALYSIS for ${pair}: ${priceVolatility.toFixed(4)}% → ${dynamicStopPips} pip SL (${volatilityFactor.toFixed(2)}x factor)`);

        // Determine pair category and session
        const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];
        const pairCategory = majorPairs.includes(pair) ? 'Major' : 'Minor/Cross';
        
        const currentHour = new Date().getUTCHours();
        let tradingSession = 'Off-Peak';
        if (currentHour >= 8 && currentHour < 17) tradingSession = 'European';
        else if (currentHour >= 13 && currentHour < 22) tradingSession = 'US';
        else if (currentHour >= 21 || currentHour < 8) tradingSession = 'Asian';

        // IMPROVED AI prompt with volatility-aware risk management
        console.log(`🔮 ENHANCED BALANCED AI analysis for ${pair} (${pairCategory} pair, ${tradingSession} session)...`);
        
        const aiAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: `You are an ENHANCED BALANCED forex trading AI designed to generate profitable signals with 70%+ win probability. Your mission is to identify HIGH-QUALITY opportunities in BOTH directions (BUY and SELL) with equal analytical rigor.

                CRITICAL BALANCE REQUIREMENT:
                - Analyze BOTH bullish (BUY) and bearish (SELL) scenarios with equal depth
                - Consider support levels as seriously as resistance levels
                - Look for oversold conditions (potential BUY signals) as much as overbought conditions (potential SELL signals)
                - Give equal weight to upward momentum potential and downward pressure
                - Identify trend continuation AND reversal opportunities equally

                ENHANCED RISK MANAGEMENT WITH IMPROVED STOP LOSS PLACEMENT:
                - MINIMUM stop loss = 45-50 pips for majors, 50-60 pips for minors, scaled by volatility
                - Place stop loss at TECHNICAL LEVELS (swing points, S/R levels) rather than fixed distances
                - Account for current volatility when setting stop distance
                - Target a minimum risk:reward ratio of 1:1.5 for first target
                - First target should be minimum 70-80 pips to improve risk:reward ratio

                BALANCED ANALYTICAL FRAMEWORK:

                FOR BUY SIGNALS - Look for:
                - Price approaching key SUPPORT levels
                - OVERSOLD conditions (RSI < 30, price below lower Bollinger Band)
                - BULLISH divergence patterns
                - UPWARD momentum building from support
                - Positive session characteristics for the pair
                - Currency strength factors favoring the base currency
                - BULLISH reversal patterns (hammer, doji at support)
                - Volume increasing on UPWARD moves

                FOR SELL SIGNALS - Look for:
                - Price approaching key RESISTANCE levels
                - OVERBOUGHT conditions (RSI > 70, price above upper Bollinger Band)
                - BEARISH divergence patterns
                - DOWNWARD pressure building from resistance
                - Negative session characteristics for the pair
                - Currency weakness factors affecting the base currency
                - BEARISH reversal patterns (shooting star, doji at resistance)
                - Volume increasing on DOWNWARD moves

                AI-DETERMINED TAKE PROFIT STRATEGY:
                You MUST analyze the specific market conditions for this pair and determine optimal take profit levels based on:
                - Key resistance/support levels in the direction of the trade
                - Fibonacci retracement levels
                - Previous swing highs/lows
                - Average daily range (ADR) of the pair
                - Current volatility conditions
                - Session-specific movement patterns
                - Technical confluence zones

                TAKE PROFIT CALCULATION REQUIREMENTS:
                - Determine 5 take profit levels with INCREASING distances from entry
                - TP1: Close target (typically 70-90 pips = higher than previous 30-60 pip range)
                - TP2: Medium-close target (typically 90-120 pips)
                - TP3: Medium target (typically 120-150 pips)
                - TP4: Medium-far target (typically 150-180 pips)
                - TP5: Far target (typically 180-220 pips)
                
                Base your pip calculations on ACTUAL market analysis:
                - Major pairs: Analyze current ADR, recent high/low levels, key S/R zones
                - JPY pairs: Account for higher pip values and typical volatility
                - Minor/Cross pairs: Consider wider spreads and volatility patterns
                - Risk/Reward: Minimum 1:1.5, target 1:2 or better for final TP

                DIRECTIONAL ANALYSIS PROCESS:
                1. First analyze the BULLISH case: What supports a BUY signal?
                2. Then analyze the BEARISH case: What supports a SELL signal?
                3. Compare the strength of evidence for each direction
                4. Choose the direction with stronger, higher-probability setup
                5. If evidence is weak for both directions, return NEUTRAL

                SESSION-SPECIFIC CONSIDERATIONS:
                - European session: EUR, GBP pairs often show directional moves
                - US session: USD pairs react to US economic factors
                - Asian session: JPY, AUD, NZD pairs more active
                - Session overlaps often create breakout opportunities

                ENHANCED MODE - Generate signals when you have reasonable conviction with proper confirmations in EITHER direction. 
                TARGET: 70%+ win rate with balanced directional analysis - prioritize QUALITY over quantity.
                
                Respond with a JSON object:
                {
                  "bullish_analysis": "detailed analysis of BUY potential",
                  "bearish_analysis": "detailed analysis of SELL potential",
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between 60-95,
                  "win_probability": number between 65-90,
                  "setup_quality": "GOOD" or "VERY_GOOD" or "EXCELLENT",
                  "confirmations_count": number of confirmations (2+ required),
                  "trend_direction": "BULLISH" or "BEARISH" or "SIDEWAYS",
                  "market_structure": "TRENDING" or "RANGING" or "BREAKOUT",
                  "support_level": number (key support price),
                  "resistance_level": number (key resistance price),
                  "entry_price": number (optimal entry vs current price),
                  "stop_loss_pips": number between 45-90 (volatility-adjusted),
                  "take_profit_pips": [number, number, number, number, number] (5 AI-determined targets based on market analysis),
                  "take_profit_rationale": "explanation of why these specific TP levels were chosen",
                  "risk_reward_ratio": "1:X" format,
                  "session_advantage": "HIGH" or "MEDIUM" or "LOW",
                  "analysis": "detailed explanation focusing on SUCCESS probability and directional choice rationale",
                  "risk_factors": "key risks that could invalidate setup",
                  "entry_strategy": "specific entry timing and conditions"
                }`
              },
              {
                role: 'user',
                content: `Analyze ${pair} (${pairCategory} pair) for ENHANCED BALANCED trading opportunity:
                Current Price: ${currentPrice}
                Recent Price History (50 points): ${priceHistory.slice(0, 10).join(', ')}...
                24h Change: ${priceChange.toFixed(2)}%
                Price Volatility: ${priceVolatility.toFixed(3)}%
                Volatility-adjusted stop loss recommendation: ${dynamicStopPips} pips
                Average Price Change: ${avgPriceChange.toFixed(3)}%
                Trading Session: ${tradingSession}
                Pair Category: ${pairCategory}
                Data Timestamp: ${marketPoint.last_update}
                
                CRITICAL INSTRUCTION: Analyze BOTH bullish and bearish scenarios with equal depth before making your decision.
                
                BALANCED ANALYSIS CHECKLIST:
                1. BULLISH CASE: Is ${pair} oversold, approaching support, showing upward momentum potential?
                2. BEARISH CASE: Is ${pair} overbought, approaching resistance, showing downward pressure?
                3. SUPPORT LEVELS: What are the key support levels that could trigger BUY signals?
                4. RESISTANCE LEVELS: What are the key resistance levels that could trigger SELL signals?
                5. SESSION IMPACT: How does the ${tradingSession} session affect ${pair} directional bias?
                6. MOMENTUM: Is momentum building in either direction?
                7. VOLUME/VOLATILITY: Does current volatility (${priceVolatility.toFixed(3)}%) support a move in either direction?
                
                RISK MANAGEMENT IMPROVEMENTS:
                - Use at least ${dynamicStopPips} pips stop loss distance (volatility-adjusted minimum)
                - Place stops at key technical levels (swing points, support/resistance)
                - Ensure first target is at least 70-80 pips (previously 30-60 which was too close)
                - Ensure risk:reward ratio is at least 1:1.5 for first target
                
                TAKE PROFIT ANALYSIS REQUIRED:
                Based on your market analysis, determine 5 optimal take profit levels considering:
                - Key resistance/support levels in trade direction
                - Fibonacci levels and technical confluence zones
                - Average daily range and current volatility
                - Session-specific movement patterns
                - Previous swing levels and reversal points
                
                Generate a signal with 5 AI-DETERMINED take profit targets based on your specific market analysis.
                Provide detailed rationale for why you chose these specific pip distances.
                
                Remember: Your goal is to find the highest-probability setup regardless of direction with market-condition-based targets and improved stop loss placement.`
              }
            ],
            max_tokens: 1200,
            temperature: 0.2
          }),
        });

        if (!aiAnalysisResponse.ok) {
          console.error(`❌ OpenAI API error for ${pair}: ${aiAnalysisResponse.status} - ${await aiAnalysisResponse.text()}`);
          continue;
        }

        const aiData = await aiAnalysisResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content;

        if (!aiContent) {
          console.error(`❌ No AI response content for ${pair}`);
          continue;
        }

        let aiSignal;
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiSignal = JSON.parse(jsonMatch[0]);
          } else {
            console.error(`❌ No JSON found in AI response for ${pair}:`, aiContent);
            continue;
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse AI response for ${pair}:`, parseError, 'Content:', aiContent);
          continue;
        }

        console.log(`📊 ENHANCED BALANCED AI Decision for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability)`);
        console.log(`🔧 Setup: ${aiSignal.setup_quality}, Trend: ${aiSignal.trend_direction}, Structure: ${aiSignal.market_structure}`);
        console.log(`🎯 Bullish Analysis: ${aiSignal.bullish_analysis?.slice(0, 100)}...`);
        console.log(`🎯 Bearish Analysis: ${aiSignal.bearish_analysis?.slice(0, 100)}...`);
        console.log(`🎯 TP Rationale: ${aiSignal.take_profit_rationale}`);

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚪ No signal generated for ${pair} - neither direction met enhanced success criteria`);
          continue;
        }

        // ENHANCED requirements with focus on improved risk-reward
        if (aiSignal.confidence < 60) {
          console.log(`⚠️ Signal confidence too low for ${pair}: ${aiSignal.confidence}% (requires 60%+)`);
          continue;
        }

        if (aiSignal.win_probability < 65) {
          console.log(`⚠️ Win probability too low for ${pair}: ${aiSignal.win_probability}% (requires 65%+)`);
          continue;
        }

        if (aiSignal.confirmations_count < 2) {
          console.log(`⚠️ Insufficient confirmations for ${pair}: ${aiSignal.confirmations_count} (requires 2+)`);
          continue;
        }

        // IMPROVED risk-reward check - force risk-reward minimum
        const riskRewardRatio = parseFloat(aiSignal.risk_reward_ratio.split(':')[1]) || 0;
        if (riskRewardRatio < 1.5) {
          console.log(`⚠️ Risk-reward ratio too low for ${pair}: ${aiSignal.risk_reward_ratio} (requires minimum 1:1.5)`);
          continue;
        }

        // Ensure minimum stop loss distance is maintained
        const minimumStopPips = isJPYPair(pair) ? 50 : 45;
        if (aiSignal.stop_loss_pips < minimumStopPips) {
          console.log(`⚠️ Stop loss too tight: ${aiSignal.stop_loss_pips} pips (minimum ${minimumStopPips} pips)`);
          aiSignal.stop_loss_pips = dynamicStopPips;
          console.log(`🔄 Adjusted stop loss to ${dynamicStopPips} pips (volatility-adjusted)`);
        }

        // Ensure minimum TP1 distance is maintained
        const minimumTP1Pips = 70;
        if (aiSignal.take_profit_pips && aiSignal.take_profit_pips[0] < minimumTP1Pips) {
          console.log(`⚠️ TP1 too close: ${aiSignal.take_profit_pips[0]} pips (minimum ${minimumTP1Pips} pips)`);
          const tpScaleFactor = minimumTP1Pips / Math.max(aiSignal.take_profit_pips[0], 1);
          
          // Scale all TPs proportionally
          aiSignal.take_profit_pips = aiSignal.take_profit_pips.map(tp => Math.round(tp * tpScaleFactor));
          console.log(`🔄 Adjusted take profits to: ${aiSignal.take_profit_pips.join(', ')} pips`);
        }

        console.log(`🎯 NEW HIGH-SUCCESS BALANCED SIGNAL GENERATED for ${pair}: ${aiSignal.signal} signal (${signalsGenerated + 1}/${maxNewSignals})`);
        console.log(`📝 Analysis: ${aiSignal.analysis}`);
        console.log(`🎯 Win Probability: ${aiSignal.win_probability}%`);
        console.log(`📊 Risk/Reward: ${aiSignal.risk_reward_ratio}`);
        console.log(`🏗️ Support: ${aiSignal.support_level}, Resistance: ${aiSignal.resistance_level}`);

        // Generate signal with improved risk management
        const entryPrice = aiSignal.entry_price || currentPrice;
        const stopLossPips = Math.max(aiSignal.stop_loss_pips || dynamicStopPips, minimumStopPips);
        const takeProfitPips = aiSignal.take_profit_pips || [70, 100, 130, 160, 190]; // Improved defaults

        console.log(`📏 IMPROVED RISK MANAGEMENT for ${pair}:`);
        console.log(`  - Stop Loss: ${stopLossPips} pips (volatility-adjusted)`);
        console.log(`  - Take Profits (5 AI-determined): ${takeProfitPips.join(', ')} pips`);
        console.log(`  - TP Rationale: ${aiSignal.take_profit_rationale}`);

        // Calculate using volatility-adjusted pip functions for 5 targets
        const stopLoss = calculateRealisticStopLoss(entryPrice, pair, aiSignal.signal, stopLossPips);
        const takeProfit1 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[0]);
        const takeProfit2 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[1]);
        const takeProfit3 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[2]);
        const takeProfit4 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[3]);
        const takeProfit5 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[4]);

        // Generate enhanced chart data
        const chartData = [];
        const baseTime = Date.now() - (30 * 60 * 1000);
        
        for (let i = 0; i < 30; i++) {
          const timePoint = baseTime + (i * 60 * 1000);
          const historicalPrice = priceHistory[Math.floor(i / 6)] || currentPrice;
          const priceVariation = (Math.sin(i * 0.2) + Math.random() * 0.2 - 0.1) * (historicalPrice * 0.0002);
          const chartPrice = historicalPrice + priceVariation;
          
          chartData.push({
            time: timePoint,
            price: parseFloat(chartPrice.toFixed(isJPYPair(pair) ? 3 : 5))
          });
        }

        chartData.push({
          time: Date.now(),
          price: parseFloat(entryPrice.toFixed(isJPYPair(pair) ? 3 : 5))
        });

        const signal = {
          symbol: pair,
          type: aiSignal.signal,
          price: parseFloat(entryPrice.toFixed(isJPYPair(pair) ? 3 : 5)),
          stop_loss: parseFloat(stopLoss.toFixed(isJPYPair(pair) ? 3 : 5)),
          take_profits: [
            parseFloat(takeProfit1.toFixed(isJPYPair(pair) ? 3 : 5)),
            parseFloat(takeProfit2.toFixed(isJPYPair(pair) ? 3 : 5)),
            parseFloat(takeProfit3.toFixed(isJPYPair(pair) ? 3 : 5)),
            parseFloat(takeProfit4.toFixed(isJPYPair(pair) ? 3 : 5)),
            parseFloat(takeProfit5.toFixed(isJPYPair(pair) ? 3 : 5))
          ],
          confidence: aiSignal.confidence,
          status: 'active',
          is_centralized: true,
          trailing_stop: null, // Will be activated when TP1 is hit
          user_id: null,
          analysis_text: `ENHANCED BALANCED ${aiSignal.setup_quality} ${pairCategory} Setup (${aiSignal.win_probability}% win probability): ${aiSignal.analysis} | Bullish: ${aiSignal.bullish_analysis?.slice(0, 50)}... | Bearish: ${aiSignal.bearish_analysis?.slice(0, 50)}... | Entry Strategy: ${aiSignal.entry_strategy} | TP Strategy: ${aiSignal.take_profit_rationale}`,
          chart_data: chartData,
          pips: stopLossPips, // Store volatility-adjusted pip value
          created_at: timestamp,
          market_conditions: [
            `Volatility: ${priceVolatility.toFixed(3)}%`,
            `Session: ${tradingSession}`,
            `Setup: ${aiSignal.setup_quality}`,
            `Market Structure: ${aiSignal.market_structure}`
          ]
        };

        console.log(`💾 Inserting NEW HIGH-SUCCESS BALANCED AI signal for ${pair} (${signalsGenerated + 1}/${maxNewSignals}) with volatility-adjusted ${stopLossPips} pip SL...`);
        const { data: insertedSignal, error: insertError } = await supabase
          .from('trading_signals')
          .insert([signal])
          .select('*')
          .single();

        if (insertError) {
          console.error(`❌ Error inserting signal for ${pair}:`, insertError);
          continue;
        }

        signalsGenerated++;
        generatedSignals.push(insertedSignal);
        console.log(`✅ Generated NEW HIGH-SUCCESS BALANCED AI signal for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability, volatility-adjusted ${stopLossPips} pips SL) - ${signalsGenerated}/${maxNewSignals}`);

        if (signalsGenerated < maxNewSignals && prioritizedPairs.indexOf(pair) < prioritizedPairs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error analyzing opportunity for ${pair}:`, error);
        continue;
      }
    }

    const finalActiveSignals = currentSignalCount + signalsGenerated;
    const generationRate = opportunitiesAnalyzed > 0 ? ((signalsGenerated / opportunitiesAnalyzed) * 100) : 0;

    console.log(`📊 ENHANCED BALANCED SIGNAL GENERATION SUMMARY:`);
    console.log(`  - Signal limit: ${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Starting signals: ${currentSignalCount}`);
    console.log(`  - Pairs analyzed: ${allCurrencyPairs.length} total available`);
    console.log(`  - New opportunities analyzed: ${opportunitiesAnalyzed}`);
    console.log(`  - New balanced signals generated: ${signalsGenerated}`);
    console.log(`  - Final active signals: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Generation rate: ${generationRate.toFixed(1)}% (Target: 50-70%)`);
    console.log(`  - Mode: ENHANCED BALANCED (60%+ confidence, 65%+ win probability, AI-DETERMINED take profits)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ENHANCED balanced signal generation completed - ${signalsGenerated} new high-success signals generated from ${opportunitiesAnalyzed} opportunities analyzed across ${allCurrencyPairs.length} pairs (${finalActiveSignals}/${MAX_ACTIVE_SIGNALS} total)`,
        signals: generatedSignals?.map(s => ({ 
          id: s.id, 
          symbol: s.symbol, 
          type: s.type, 
          price: s.price,
          confidence: s.confidence 
        })) || [],
        stats: {
          opportunitiesAnalyzed,
          signalsGenerated,
          generationRate: `${generationRate.toFixed(1)}%`,
          existingSignals: currentSignalCount,
          totalActiveSignals: finalActiveSignals,
          signalLimit: MAX_ACTIVE_SIGNALS,
          limitReached: finalActiveSignals >= MAX_ACTIVE_SIGNALS,
          enhancedMode: true,
          balancedMode: true,
          targetSuccessRate: '70%+',
          totalPairsAvailable: allCurrencyPairs.length,
          pairCategories: 'Major + Minor + Cross pairs'
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        approach: 'enhanced_balanced_ai_determined_take_profits'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 ENHANCED BALANCED SIGNAL GENERATION error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
