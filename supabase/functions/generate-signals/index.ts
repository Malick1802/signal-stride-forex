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

const calculateRealisticStopLoss = (entryPrice: number, symbol: string, signalType: string, pipDistance: number): number => {
  const pipValue = getPipValue(symbol);
  const stopLossDistance = pipDistance * pipValue;
  
  return signalType === 'BUY' 
    ? entryPrice - stopLossDistance 
    : entryPrice + stopLossDistance;
};

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

    console.log(`🚀 Starting ENHANCED SUCCESS-FOCUSED AI analysis for ${prioritizedPairs.length} NEW pairs...`);

    // Analyze pairs individually with enhanced success-focused generation
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
        
        console.log(`🧠 ENHANCED SUCCESS analysis of ${pair} at price ${currentPrice} (${signalsGenerated + 1}/${maxNewSignals})...`);

        // Get extended historical price data for enhanced analysis
        const { data: historicalData } = await supabase
          .from('centralized_market_state')
          .select('current_price, last_update')
          .eq('symbol', pair)
          .order('last_update', { ascending: false })
          .limit(50); // More data for better analysis

        const priceHistory = historicalData?.map(d => parseFloat(d.current_price.toString())).slice(0, 20) || [currentPrice];
        const priceChange = priceHistory.length > 1 ? 
          ((currentPrice - priceHistory[priceHistory.length - 1]) / priceHistory[priceHistory.length - 1] * 100) : 0;

        // Determine pair category and session
        const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];
        const pairCategory = majorPairs.includes(pair) ? 'Major' : 'Minor/Cross';
        
        const currentHour = new Date().getUTCHours();
        let tradingSession = 'Off-Peak';
        if (currentHour >= 8 && currentHour < 17) tradingSession = 'European';
        else if (currentHour >= 13 && currentHour < 22) tradingSession = 'US';
        else if (currentHour >= 21 || currentHour < 8) tradingSession = 'Asian';

        // ENHANCED AI prompt with success-focused approach and realistic pip targets
        console.log(`🔮 ENHANCED SUCCESS-FOCUSED AI analysis for ${pair} (${pairCategory} pair, ${tradingSession} session)...`);
        
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
                content: `You are an ENHANCED SUCCESS-FOCUSED forex trading AI designed to generate profitable signals with 70%+ win probability. Your priority is SIGNAL SUCCESS over conservative filtering.

                ENHANCED SUCCESS REQUIREMENTS:
                - 60%+ confidence minimum (practical threshold for real trading)
                - 65%+ win probability target (realistic expectation)
                - 2+ technical confirmations (trend analysis + one additional factor)
                - REALISTIC pip targets based on pair volatility
                - PROPER stop losses (20-60 pips for majors, 30-80 pips for minors)
                - Consider both BULLISH and BEARISH setups equally
                - Account for trading session characteristics
                
                REALISTIC PIP CALCULATIONS:
                - Major pairs (EURUSD, GBPUSD, etc.): 15-50 pips for SL, 20-80 pips for TP
                - JPY pairs (USDJPY, EURJPY, etc.): 20-60 pips for SL, 30-100 pips for TP
                - Minor/Cross pairs: 25-70 pips for SL, 35-120 pips for TP
                - Risk/Reward: Minimum 1:1.5, target 1:2 or better
                
                CRITICAL SUCCESS FACTORS:
                - MARKET DIRECTION BIAS: Analyze if market is trending UP, DOWN, or SIDEWAYS
                - TREND ALIGNMENT: Only trade WITH the primary trend direction
                - SUPPORT/RESISTANCE: Use key levels for entry timing
                - SESSION TIMING: Consider session-specific pair behavior
                - VOLATILITY: Adjust pip targets based on recent price movement
                
                PAIR-SPECIFIC APPROACH:
                - Major pairs: Focus on session overlaps and news impact (20-50 pip targets)
                - Minor/Cross pairs: Look for breakouts and trending moves (30-80 pip targets)
                - JPY pairs: Account for carry trade flows and session timing (25-70 pip targets)
                
                ENHANCED MODE - Generate signals when you have reasonable conviction with proper confirmations. 
                TARGET: 70%+ win rate with 50-70% signal generation rate - prioritize SUCCESS over quantity.
                
                Respond with a JSON object:
                {
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between 60-95,
                  "win_probability": number between 65-90,
                  "setup_quality": "GOOD" or "VERY_GOOD" or "EXCELLENT",
                  "confirmations_count": number of confirmations (2+ required),
                  "trend_direction": "BULLISH" or "BEARISH" or "SIDEWAYS",
                  "market_structure": "TRENDING" or "RANGING" or "BREAKOUT",
                  "entry_price": number (optimal entry vs current price),
                  "stop_loss_pips": number between 15-80 (realistic for pair type),
                  "take_profit_pips": [number, number, number] (realistic progressive targets),
                  "risk_reward_ratio": "1:X" format,
                  "session_advantage": "HIGH" or "MEDIUM" or "LOW",
                  "analysis": "detailed explanation focusing on SUCCESS probability",
                  "risk_factors": "key risks that could invalidate setup",
                  "entry_strategy": "specific entry timing and conditions"
                }
                
                ENHANCED SIGNAL CRITERIA:
                - Clear trend direction with momentum
                - Confluence at key support/resistance levels  
                - Favorable session timing for the pair
                - Adequate volatility for movement potential
                - Risk/reward minimum 1:1.5 (preferably 1:2+)
                - Multiple timeframe alignment
                - No major fundamental conflicts
                
                NEUTRAL CRITERIA (use sparingly):
                - Genuine market uncertainty
                - Conflicting signals across timeframes
                - Major news events pending
                - Extremely poor risk/reward scenarios`
              },
              {
                role: 'user',
                content: `Analyze ${pair} (${pairCategory} pair) for ENHANCED SUCCESS-FOCUSED trading opportunity:
                Current Price: ${currentPrice}
                Recent Price History (20 points): ${priceHistory.slice(0, 10).join(', ')}...
                24h Change: ${priceChange.toFixed(2)}%
                Trading Session: ${tradingSession}
                Pair Category: ${pairCategory}
                Data Timestamp: ${marketPoint.last_update}
                
                PRIORITY: Generate a high-success signal if market conditions support it.
                
                Consider these SUCCESS factors:
                1. What is the PRIMARY trend direction for ${pair}?
                2. Are we in a favorable ${tradingSession} session for this pair?
                3. Is there clear directional momentum?
                4. What are the nearest support/resistance levels?
                5. What are REALISTIC pip targets for ${pair} (${pairCategory} pair)?
                
                Generate a signal focused on SUCCESS PROBABILITY with REALISTIC pip targets.
                For ${pair}, use appropriate pip ranges:
                ${pairCategory === 'Major' ? '- Stop Loss: 15-50 pips, Take Profit: 20-80 pips' : '- Stop Loss: 25-70 pips, Take Profit: 35-120 pips'}`
              }
            ],
            max_tokens: 1000,
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

        console.log(`📊 ENHANCED AI Decision for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability)`);
        console.log(`🔧 Setup: ${aiSignal.setup_quality}, Trend: ${aiSignal.trend_direction}, Structure: ${aiSignal.market_structure}`);

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚪ No signal generated for ${pair} - did not meet enhanced success criteria`);
          continue;
        }

        // ENHANCED requirements - more realistic thresholds for success
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

        console.log(`🎯 NEW HIGH-SUCCESS SIGNAL GENERATED for ${pair}: ${aiSignal.signal} signal (${signalsGenerated + 1}/${maxNewSignals})`);
        console.log(`📝 Analysis: ${aiSignal.analysis}`);
        console.log(`🎯 Win Probability: ${aiSignal.win_probability}%`);
        console.log(`📊 Risk/Reward: ${aiSignal.risk_reward_ratio}`);

        // Generate signal with REALISTIC pip calculations
        const entryPrice = aiSignal.entry_price || currentPrice;
        const stopLossPips = Math.max(aiSignal.stop_loss_pips || 30, 15); // Minimum 15 pips
        const takeProfitPips = aiSignal.take_profit_pips || [30, 50, 80]; // Realistic targets

        console.log(`📏 REALISTIC pip calculations for ${pair}:`);
        console.log(`  - Stop Loss: ${stopLossPips} pips`);
        console.log(`  - Take Profits: ${takeProfitPips.join(', ')} pips`);

        // Calculate using realistic pip functions
        const stopLoss = calculateRealisticStopLoss(entryPrice, pair, aiSignal.signal, stopLossPips);
        const takeProfit1 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[0]);
        const takeProfit2 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[1]);
        const takeProfit3 = calculateRealisticTakeProfit(entryPrice, pair, aiSignal.signal, takeProfitPips[2]);

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
            parseFloat(takeProfit3.toFixed(isJPYPair(pair) ? 3 : 5))
          ],
          confidence: aiSignal.confidence,
          status: 'active',
          is_centralized: true,
          user_id: null,
          analysis_text: `ENHANCED ${aiSignal.setup_quality} ${pairCategory} Setup (${aiSignal.win_probability}% win probability): ${aiSignal.analysis} | Entry Strategy: ${aiSignal.entry_strategy}`,
          chart_data: chartData,
          pips: stopLossPips, // Store REALISTIC pip value
          created_at: timestamp
        };

        console.log(`💾 Inserting NEW HIGH-SUCCESS AI signal for ${pair} (${signalsGenerated + 1}/${maxNewSignals}) with ${stopLossPips} pip SL...`);
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
        console.log(`✅ Generated NEW HIGH-SUCCESS AI signal for ${pair} (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability, ${stopLossPips} pips SL) - ${signalsGenerated}/${maxNewSignals}`);

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

    console.log(`📊 ENHANCED SUCCESS-FOCUSED SIGNAL GENERATION SUMMARY:`);
    console.log(`  - Signal limit: ${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Starting signals: ${currentSignalCount}`);
    console.log(`  - Pairs analyzed: ${allCurrencyPairs.length} total available`);
    console.log(`  - New opportunities analyzed: ${opportunitiesAnalyzed}`);
    console.log(`  - New high-success signals generated: ${signalsGenerated}`);
    console.log(`  - Final active signals: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Generation rate: ${generationRate.toFixed(1)}% (Target: 50-70%)`);
    console.log(`  - Mode: ENHANCED SUCCESS-FOCUSED (60%+ confidence, 65%+ win probability, REALISTIC pips)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ENHANCED success-focused signal generation completed - ${signalsGenerated} new high-success signals generated from ${opportunitiesAnalyzed} opportunities analyzed across ${allCurrencyPairs.length} pairs (${finalActiveSignals}/${MAX_ACTIVE_SIGNALS} total)`,
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
          targetSuccessRate: '70%+',
          totalPairsAvailable: allCurrencyPairs.length,
          pairCategories: 'Major + Minor + Cross pairs'
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        approach: 'enhanced_success_focused_realistic_pips'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 ENHANCED SUCCESS-FOCUSED SIGNAL GENERATION error:', error);
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
