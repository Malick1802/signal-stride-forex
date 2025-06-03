
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum number of active signals allowed
const MAX_ACTIVE_SIGNALS = 15;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    const targetPair = body.symbol; // Optional: generate signal for specific pair
    
    console.log(`🎯 ${isCronTriggered ? 'CRON AUTOMATIC' : 'MANUAL'} HIGH-PROBABILITY signal generation starting...`);
    console.log(`🎯 Target pair: ${targetPair || 'Auto-detect HIGH-PROBABILITY opportunities'}`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log(`🛡️ MODE: HIGH-PROBABILITY ALL-PAIRS (70%+ win rate target) - MAX ${MAX_ACTIVE_SIGNALS} SIGNALS`);
    
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

    // GET EXISTING ACTIVE SIGNALS TO CHECK LIMIT
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

    // CHECK IF WE'VE REACHED THE LIMIT
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
            highProbabilityMode: true,
            expectedWinRate: '70%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual',
          approach: 'signal_limit_enforcement'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate how many new signals we can generate
    const maxNewSignals = MAX_ACTIVE_SIGNALS - currentSignalCount;
    console.log(`✅ Can generate up to ${maxNewSignals} new HIGH-PROBABILITY signals`);

    // MARKET DATA VALIDATION - Check for fresh data
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

    // Validate data freshness (within last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const freshData = marketData?.filter(d => new Date(d.last_update) > tenMinutesAgo) || [];
    
    console.log(`🕒 Fresh data points (last 10 min): ${freshData.length}/${marketData?.length || 0}`);

    if (freshData.length === 0) {
      console.log('⚠️ No fresh centralized market data available, triggering market update first...');
      
      try {
        const { error: updateError } = await supabase.functions.invoke('centralized-market-stream');
        if (updateError) {
          console.error('❌ Failed to trigger market update:', updateError);
        } else {
          console.log('✅ Market data update triggered, waiting for fresh data...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Retry fetching fresh data
          const { data: retryData } = await supabase
            .from('centralized_market_state')
            .select('*')
            .gte('last_update', tenMinutesAgo.toISOString())
            .order('last_update', { ascending: false });
            
          if (retryData && retryData.length > 0) {
            console.log(`✅ Fresh data available after update: ${retryData.length} points`);
            marketData.push(...retryData);
          }
        }
      } catch (error) {
        console.error('❌ Failed to trigger market update:', error);
      }
    }

    // ALL AVAILABLE CURRENCY PAIRS - Major, Minor, and Cross pairs for comprehensive coverage
    const allCurrencyPairs = [
      // Major Pairs (highest liquidity)
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      
      // Minor Pairs (Cross currencies - no USD)
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
      'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
      'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY', 'GBPAUD', 'EURCAD'
    ];
    
    console.log(`🌍 EXPANDED PAIR COVERAGE: Analyzing ${allCurrencyPairs.length} currency pairs for high-probability opportunities`);
    
    // Filter out pairs that already have active signals
    const availablePairs = targetPair 
      ? (existingPairs.has(targetPair) ? [] : [targetPair])
      : allCurrencyPairs.filter(pair => !existingPairs.has(pair));
    
    // Limit available pairs to the maximum we can generate
    const prioritizedPairs = availablePairs.slice(0, maxNewSignals);
    
    console.log(`🔍 Available pairs for NEW HIGH-PROBABILITY signals: ${prioritizedPairs.length} (limited to ${maxNewSignals})`);
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
            highProbabilityMode: true,
            expectedWinRate: '70%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual',
          approach: 'signal_limit_enforcement'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get latest price for available currency pairs (only those without signals)
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

    console.log(`🎯 Will analyze ${latestPrices.size} pairs for NEW HIGH-PROBABILITY signal opportunities (limit: ${maxNewSignals})`);

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
            highProbabilityMode: true,
            expectedWinRate: '70%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual',
          approach: 'signal_limit_enforcement'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = new Date().toISOString();
    let signalsGenerated = 0;
    let opportunitiesAnalyzed = 0;
    const generatedSignals = [];

    console.log(`🚀 Starting HIGH-PROBABILITY AI analysis for ${prioritizedPairs.length} NEW pairs across ALL CATEGORIES (limit: ${maxNewSignals})...`);

    // Analyze pairs individually with HIGH-PROBABILITY generation (only for pairs without signals)
    for (const pair of prioritizedPairs) {
      // Stop if we've reached our limit
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
        
        console.log(`🧠 HIGH-PROBABILITY analysis of ${pair} at price ${currentPrice} (${signalsGenerated + 1}/${maxNewSignals})...`);

        // Get extended historical price data for analysis
        const { data: historicalData } = await supabase
          .from('centralized_market_state')
          .select('current_price, last_update')
          .eq('symbol', pair)
          .order('last_update', { ascending: false })
          .limit(30);

        // Prepare market analysis context for AI
        const priceHistory = historicalData?.map(d => parseFloat(d.current_price.toString())).slice(0, 15) || [currentPrice];
        const priceChange = priceHistory.length > 1 ? 
          ((currentPrice - priceHistory[priceHistory.length - 1]) / priceHistory[priceHistory.length - 1] * 100) : 0;

        // Determine pair category for AI context
        const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];
        const pairCategory = majorPairs.includes(pair) ? 'Major' : 'Minor/Cross';

        // HIGH-PROBABILITY AI prompt - balanced approach for consistent signal generation
        console.log(`🔮 HIGH-PROBABILITY AI opportunity check for ${pair} (${pairCategory} pair)...`);
        
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
                content: `You are a HIGH-PROBABILITY forex trading AI that generates signals with 70%+ win probability. You focus on quality signals while maintaining a reasonable generation rate for active trading.

                HIGH-PROBABILITY REQUIREMENTS FOR SIGNAL GENERATION:
                - 75%+ confidence minimum (realistic threshold for consistent trading)
                - Must have 2-3 technical confirmations (trend + momentum OR pattern + support/resistance)
                - Reasonable fundamental bias supporting the direction
                - Clear risk/reward ratio of at least 1:1.5
                - No major conflicting signals
                - Market structure should be reasonably clear
                - Works for ALL pair types: Major, Minor, and Cross pairs
                
                PAIR-SPECIFIC CONSIDERATIONS:
                - Major pairs: Standard analysis with good liquidity expectations
                - Minor/Cross pairs: Account for slightly wider spreads and volatility patterns
                - All pairs: Look for clear directional bias with reasonable confirmations
                
                HIGH-PROBABILITY MODE - Generate BUY/SELL signals when you have good conviction with adequate confirmations. Use NEUTRAL only when the setup is genuinely unclear or risky.
                
                TARGET: 70%+ win rate with 40-60% signal generation rate - accept good quality setups that meet the criteria.
                
                Respond with a JSON object containing:
                {
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between 75-92 (75+ for signal generation),
                  "win_probability": number between 70-88,
                  "setup_quality": "GOOD" or "VERY_GOOD" or "EXCELLENT",
                  "confirmations_count": number of technical confirmations (2-3 required),
                  "entry_price": number (current price adjusted for optimal entry),
                  "stop_loss_pips": number between 15-50 (adjust for pair volatility),
                  "take_profit_pips": [number, number, number] (realistic targets),
                  "analysis": "detailed explanation focusing on why this has 70%+ win probability",
                  "risk_factors": "any risks that could invalidate the setup",
                  "market_setup": "description of the setup detected",
                  "pair_category": "Major/Minor/Cross pair specific considerations"
                }
                
                SIGNAL CRITERIA (use BUY/SELL when met):
                - Clear directional bias with reasonable confirmations
                - Confidence above 75%
                - At least 2 technical confirmations
                - Reasonable risk/reward ratio
                - Acceptable market structure
                - No major fundamental risks
                - Sufficient volatility for movement potential
                
                NEUTRAL CRITERIA (use NEUTRAL when):
                - Genuine uncertainty or choppy conditions
                - Confidence below 75%
                - Less than 2 confirmations
                - Poor risk/reward ratio
                - Major conflicting signals`
              },
              {
                role: 'user',
                content: `Analyze ${pair} (${pairCategory} pair) for HIGH-PROBABILITY trading opportunity (70%+ win rate requirement):
                Current Price: ${currentPrice}
                Recent Prices: ${priceHistory.join(', ')}
                24h Change: ${priceChange.toFixed(2)}%
                Market Session: ${new Date().getUTCHours() >= 12 && new Date().getUTCHours() < 20 ? 'Active Trading Hours' : 'Off-Peak Hours'}
                Pair Category: ${pairCategory}
                Data Freshness: ${marketPoint.last_update}
                
                Generate a signal if you have good conviction (75%+ confidence) with adequate technical confirmations and 70%+ win probability for ${pair}.
                
                Consider ${pairCategory} pair characteristics:
                - Major pairs: Good liquidity, tighter spreads, reliable patterns
                - Minor/Cross pairs: Adequate liquidity, wider spreads, unique correlation patterns
                
                Focus on high-probability setups that meet the criteria for consistent trading success.`
              }
            ],
            max_tokens: 800,
            temperature: 0.3
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

        // Parse AI response with better error handling
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

        console.log(`📊 HIGH-PROBABILITY AI Decision for ${pair} (${pairCategory}): ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability)`);
        console.log(`🔧 Setup Quality: ${aiSignal.setup_quality}, Confirmations: ${aiSignal.confirmations_count}`);

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚪ No signal generated for ${pair} - did not meet high-probability criteria`);
          continue;
        }

        // HIGH-PROBABILITY requirements - realistic thresholds
        if (aiSignal.confidence < 75) {
          console.log(`⚠️ Signal confidence too low for ${pair}: ${aiSignal.confidence}% (requires 75%+)`);
          continue;
        }

        if (aiSignal.win_probability < 70) {
          console.log(`⚠️ Win probability too low for ${pair}: ${aiSignal.win_probability}% (requires 70%+)`);
          continue;
        }

        if (aiSignal.confirmations_count < 2) {
          console.log(`⚠️ Insufficient confirmations for ${pair}: ${aiSignal.confirmations_count} (requires 2+)`);
          continue;
        }

        console.log(`🎯 NEW HIGH-PROBABILITY SIGNAL GENERATED for ${pair} (${pairCategory}): ${aiSignal.signal} signal (${signalsGenerated + 1}/${maxNewSignals})`);
        console.log(`📝 Setup: ${aiSignal.market_setup}`);
        console.log(`🎯 Win Probability: ${aiSignal.win_probability}%`);
        console.log(`✅ Confirmations: ${aiSignal.confirmations_count}`);

        // Generate signal with high-probability settings
        const entryPrice = aiSignal.entry_price || currentPrice;
        const stopLossPips = aiSignal.stop_loss_pips || (pairCategory === 'Major' ? 25 : 35);
        const takeProfitPips = aiSignal.take_profit_pips || (pairCategory === 'Major' ? [20, 35, 50] : [25, 45, 65]);

        // Convert pips to price levels
        const pipValue = pair.includes('JPY') ? 0.01 : 0.0001;
        const stopLossDistance = stopLossPips * pipValue;
        
        const stopLoss = aiSignal.signal === 'BUY' 
          ? entryPrice - stopLossDistance 
          : entryPrice + stopLossDistance;
          
        const takeProfit1 = aiSignal.signal === 'BUY' 
          ? entryPrice + (takeProfitPips[0] * pipValue)
          : entryPrice - (takeProfitPips[0] * pipValue);
          
        const takeProfit2 = aiSignal.signal === 'BUY' 
          ? entryPrice + (takeProfitPips[1] * pipValue)
          : entryPrice - (takeProfitPips[1] * pipValue);
          
        const takeProfit3 = aiSignal.signal === 'BUY' 
          ? entryPrice + (takeProfitPips[2] * pipValue)
          : entryPrice - (takeProfitPips[2] * pipValue);

        // Generate chart data based on recent price action
        const chartData = [];
        const baseTime = Date.now() - (30 * 60 * 1000);
        
        for (let i = 0; i < 30; i++) {
          const timePoint = baseTime + (i * 60 * 1000);
          const historicalPrice = priceHistory[Math.floor(i / 6)] || currentPrice;
          const priceVariation = (Math.sin(i * 0.2) + Math.random() * 0.2 - 0.1) * (historicalPrice * 0.0002);
          const chartPrice = historicalPrice + priceVariation;
          
          chartData.push({
            time: timePoint,
            price: parseFloat(chartPrice.toFixed(pair.includes('JPY') ? 3 : 5))
          });
        }

        chartData.push({
          time: Date.now(),
          price: parseFloat(entryPrice.toFixed(pair.includes('JPY') ? 3 : 5))
        });

        const signal = {
          symbol: pair,
          type: aiSignal.signal,
          price: parseFloat(entryPrice.toFixed(pair.includes('JPY') ? 3 : 5)),
          stop_loss: parseFloat(stopLoss.toFixed(pair.includes('JPY') ? 3 : 5)),
          take_profits: [
            parseFloat(takeProfit1.toFixed(pair.includes('JPY') ? 3 : 5)),
            parseFloat(takeProfit2.toFixed(pair.includes('JPY') ? 3 : 5)),
            parseFloat(takeProfit3.toFixed(pair.includes('JPY') ? 3 : 5))
          ],
          confidence: aiSignal.confidence,
          status: 'active',
          is_centralized: true,
          user_id: null,
          analysis_text: `HIGH-PROBABILITY ${aiSignal.setup_quality} ${pairCategory} Setup (${aiSignal.win_probability}% win probability): ${aiSignal.analysis}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: timestamp
        };

        // Insert the new high-probability signal
        console.log(`💾 Inserting NEW HIGH-PROBABILITY AI signal for ${pair} (${pairCategory}) (${signalsGenerated + 1}/${maxNewSignals})...`);
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
        console.log(`✅ Generated NEW HIGH-PROBABILITY AI signal for ${pair} (${pairCategory}) (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability) - ${signalsGenerated}/${maxNewSignals}`);

        // Add minimal delay between analyses to avoid rate limiting
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

    console.log(`📊 HIGH-PROBABILITY SIGNAL GENERATION SUMMARY (ALL PAIRS):`);
    console.log(`  - Signal limit: ${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Starting signals: ${currentSignalCount}`);
    console.log(`  - Pairs analyzed: ${allCurrencyPairs.length} total available`);
    console.log(`  - New opportunities analyzed: ${opportunitiesAnalyzed}`);
    console.log(`  - New high-probability signals generated: ${signalsGenerated}`);
    console.log(`  - Final active signals: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Generation rate: ${generationRate.toFixed(1)}% (Target: 40-60%)`);
    console.log(`  - Mode: HIGH-PROBABILITY ALL-PAIRS (75%+ confidence, 70%+ win probability)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `HIGH-PROBABILITY all-pairs signal generation completed - ${signalsGenerated} new high-probability signals generated from ${opportunitiesAnalyzed} opportunities analyzed across ${allCurrencyPairs.length} pairs (${finalActiveSignals}/${MAX_ACTIVE_SIGNALS} total)`,
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
          highProbabilityMode: true,
          expectedWinRate: '70%+',
          totalPairsAvailable: allCurrencyPairs.length,
          pairCategories: 'Major + Minor + Cross pairs'
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        approach: 'high_probability_all_pairs'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 HIGH-PROBABILITY ALL-PAIRS SIGNAL GENERATION error:', error);
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
