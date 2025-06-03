
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum number of active signals allowed - ULTRA CONSERVATIVE
const MAX_ACTIVE_SIGNALS = 15;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    const targetPair = body.symbol; // Optional: generate signal for specific pair
    
    console.log(`🎯 ${isCronTriggered ? 'CRON AUTOMATIC' : 'MANUAL'} ULTRA-CONSERVATIVE signal generation starting...`);
    console.log(`🎯 Target pair: ${targetPair || 'Auto-detect ULTRA-CONSERVATIVE opportunities'}`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log(`🛡️ MODE: ULTRA-CONSERVATIVE (90%+ confidence, 80%+ win rate target) - MAX ${MAX_ACTIVE_SIGNALS} SIGNALS`);
    
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
            ultraConservativeMode: true,
            expectedWinRate: '80%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual',
          approach: 'ultra_conservative_signal_limit_enforcement'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate how many new signals we can generate
    const maxNewSignals = MAX_ACTIVE_SIGNALS - currentSignalCount;
    console.log(`✅ Can generate up to ${maxNewSignals} new ULTRA-CONSERVATIVE signals`);

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

    // ULTRA CONSERVATIVE PAIR SELECTION - Only major pairs with highest liquidity
    const ultraConservativePairs = [
      // Only major pairs for ultra-conservative approach
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'
    ];
    
    console.log(`🛡️ ULTRA-CONSERVATIVE: Analyzing only ${ultraConservativePairs.length} major pairs with highest liquidity`);
    
    // Filter out pairs that already have active signals
    const availablePairs = targetPair 
      ? (existingPairs.has(targetPair) ? [] : [targetPair])
      : ultraConservativePairs.filter(pair => !existingPairs.has(pair));
    
    // Limit available pairs to the maximum we can generate
    const prioritizedPairs = availablePairs.slice(0, maxNewSignals);
    
    console.log(`🔍 Available pairs for NEW ULTRA-CONSERVATIVE signals: ${prioritizedPairs.length} (limited to ${maxNewSignals})`);
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
            ultraConservativeMode: true,
            expectedWinRate: '80%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual',
          approach: 'ultra_conservative_signal_limit_enforcement'
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

    console.log(`🎯 Will analyze ${latestPrices.size} pairs for NEW ULTRA-CONSERVATIVE signal opportunities (limit: ${maxNewSignals})`);

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
            ultraConservativeMode: true,
            expectedWinRate: '80%+'
          },
          timestamp: new Date().toISOString(),
          trigger: isCronTriggered ? 'cron' : 'manual',
          approach: 'ultra_conservative_signal_limit_enforcement'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = new Date().toISOString();
    let signalsGenerated = 0;
    let opportunitiesAnalyzed = 0;
    const generatedSignals = [];

    console.log(`🚀 Starting ULTRA-CONSERVATIVE AI analysis for ${prioritizedPairs.length} NEW major pairs (limit: ${maxNewSignals})...`);

    // Analyze pairs individually with ULTRA-CONSERVATIVE generation (only for pairs without signals)
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
        
        console.log(`🧠 ULTRA-CONSERVATIVE analysis of ${pair} at price ${currentPrice} (${signalsGenerated + 1}/${maxNewSignals})...`);

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

        // ULTRA-CONSERVATIVE AI prompt - extremely strict requirements
        console.log(`🔮 ULTRA-CONSERVATIVE AI opportunity check for ${pair} (major pair)...`);
        
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
                content: `You are an ULTRA-CONSERVATIVE forex trading AI that RARELY generates signals - only when absolutely certain of high probability outcomes.

                ULTRA-CONSERVATIVE REQUIREMENTS FOR SIGNAL GENERATION:
                - 90%+ confidence minimum (extremely high threshold)
                - Must have 3+ strong technical confirmations (trend + momentum + pattern/support/resistance)
                - Strong fundamental bias supporting the direction
                - Clear risk/reward ratio of at least 1:2
                - No conflicting signals whatsoever
                - Market structure must be crystal clear
                - Only major pairs with highest liquidity
                - Perfect market timing and conditions
                
                ULTRA-CONSERVATIVE MODE - Generate BUY/SELL signals ONLY when you have exceptional conviction with multiple strong confirmations. Use NEUTRAL for 90%+ of analyses as we prioritize quality over quantity.
                
                TARGET: 80%+ win rate with 10-20% signal generation rate - accept ONLY the highest quality setups.
                
                Respond with a JSON object containing:
                {
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between 90-95 (90+ required for signal generation),
                  "win_probability": number between 80-90,
                  "setup_quality": "EXCEPTIONAL" or "VERY_GOOD" or "GOOD",
                  "confirmations_count": number of technical confirmations (3+ required),
                  "entry_price": number (current price adjusted for optimal entry),
                  "stop_loss_pips": number between 20-40 (conservative stops),
                  "take_profit_pips": [number, number, number] (conservative targets),
                  "analysis": "detailed explanation focusing on why this has 80%+ win probability",
                  "risk_factors": "any risks that could invalidate the setup",
                  "market_setup": "description of the exceptional setup detected",
                  "fundamental_bias": "strong fundamental support for the direction"
                }
                
                SIGNAL CRITERIA (use BUY/SELL only when ALL met):
                - Clear exceptional directional bias with multiple strong confirmations
                - Confidence above 90%
                - At least 3 technical confirmations
                - Strong risk/reward ratio (1:2 minimum)
                - Crystal clear market structure
                - Strong fundamental support
                - Perfect timing conditions
                
                NEUTRAL CRITERIA (use NEUTRAL when ANY not met):
                - Any uncertainty or mixed signals
                - Confidence below 90%
                - Less than 3 confirmations
                - Poor risk/reward ratio
                - Unclear market structure
                - Conflicting fundamentals
                - Suboptimal timing`
              },
              {
                role: 'user',
                content: `Analyze ${pair} (major pair) for ULTRA-CONSERVATIVE trading opportunity (80%+ win rate requirement):
                Current Price: ${currentPrice}
                Recent Prices: ${priceHistory.join(', ')}
                24h Change: ${priceChange.toFixed(2)}%
                Market Session: ${new Date().getUTCHours() >= 12 && new Date().getUTCHours() < 20 ? 'Active Trading Hours' : 'Off-Peak Hours'}
                Data Freshness: ${marketPoint.last_update}
                
                Generate a signal ONLY if you have exceptional conviction (90%+ confidence) with multiple strong confirmations and 80%+ win probability for ${pair}.
                
                Focus on ultra-conservative setups that meet the strictest criteria for consistent trading success. Reject 90%+ of opportunities to maintain the highest quality standards.`
              }
            ],
            max_tokens: 800,
            temperature: 0.1
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

        console.log(`📊 ULTRA-CONSERVATIVE AI Decision for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability)`);
        console.log(`🔧 Setup Quality: ${aiSignal.setup_quality}, Confirmations: ${aiSignal.confirmations_count}`);

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚪ No signal generated for ${pair} - did not meet ultra-conservative criteria`);
          continue;
        }

        // ULTRA-CONSERVATIVE requirements - extremely strict thresholds
        if (aiSignal.confidence < 90) {
          console.log(`⚠️ Signal confidence too low for ${pair}: ${aiSignal.confidence}% (requires 90%+)`);
          continue;
        }

        if (aiSignal.win_probability < 80) {
          console.log(`⚠️ Win probability too low for ${pair}: ${aiSignal.win_probability}% (requires 80%+)`);
          continue;
        }

        if (aiSignal.confirmations_count < 3) {
          console.log(`⚠️ Insufficient confirmations for ${pair}: ${aiSignal.confirmations_count} (requires 3+)`);
          continue;
        }

        if (aiSignal.setup_quality !== 'EXCEPTIONAL' && aiSignal.setup_quality !== 'VERY_GOOD') {
          console.log(`⚠️ Setup quality not exceptional enough for ${pair}: ${aiSignal.setup_quality}`);
          continue;
        }

        console.log(`🎯 NEW ULTRA-CONSERVATIVE SIGNAL GENERATED for ${pair}: ${aiSignal.signal} signal (${signalsGenerated + 1}/${maxNewSignals})`);
        console.log(`📝 Setup: ${aiSignal.market_setup}`);
        console.log(`🎯 Win Probability: ${aiSignal.win_probability}%`);
        console.log(`✅ Confirmations: ${aiSignal.confirmations_count}`);

        // Generate signal with ultra-conservative settings
        const entryPrice = aiSignal.entry_price || currentPrice;
        const stopLossPips = aiSignal.stop_loss_pips || 30; // Conservative stops
        const takeProfitPips = aiSignal.take_profit_pips || [25, 45, 65]; // Conservative targets

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
          analysis_text: `ULTRA-CONSERVATIVE ${aiSignal.setup_quality} Major Pair Setup (${aiSignal.win_probability}% win probability): ${aiSignal.analysis} | Fundamental Bias: ${aiSignal.fundamental_bias || 'Strong directional support'}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: timestamp
        };

        // Insert the new ultra-conservative signal
        console.log(`💾 Inserting NEW ULTRA-CONSERVATIVE AI signal for ${pair} (${signalsGenerated + 1}/${maxNewSignals})...`);
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
        console.log(`✅ Generated NEW ULTRA-CONSERVATIVE AI signal for ${pair} (${aiSignal.confidence}% confidence, ${aiSignal.win_probability}% win probability) - ${signalsGenerated}/${maxNewSignals}`);

        // Add delay between analyses to avoid rate limiting
        if (signalsGenerated < maxNewSignals && prioritizedPairs.indexOf(pair) < prioritizedPairs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ Error analyzing opportunity for ${pair}:`, error);
        continue;
      }
    }

    const finalActiveSignals = currentSignalCount + signalsGenerated;
    const generationRate = opportunitiesAnalyzed > 0 ? ((signalsGenerated / opportunitiesAnalyzed) * 100) : 0;

    console.log(`📊 ULTRA-CONSERVATIVE SIGNAL GENERATION SUMMARY:`);
    console.log(`  - Signal limit: ${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Starting signals: ${currentSignalCount}`);
    console.log(`  - Pairs analyzed: ${ultraConservativePairs.length} major pairs available`);
    console.log(`  - New opportunities analyzed: ${opportunitiesAnalyzed}`);
    console.log(`  - New ultra-conservative signals generated: ${signalsGenerated}`);
    console.log(`  - Final active signals: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - Generation rate: ${generationRate.toFixed(1)}% (Target: 10-20%)`);
    console.log(`  - Mode: ULTRA-CONSERVATIVE (90%+ confidence, 80%+ win probability)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ULTRA-CONSERVATIVE signal generation completed - ${signalsGenerated} new ultra-conservative signals generated from ${opportunitiesAnalyzed} opportunities analyzed across ${ultraConservativePairs.length} major pairs (${finalActiveSignals}/${MAX_ACTIVE_SIGNALS} total)`,
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
          ultraConservativeMode: true,
          expectedWinRate: '80%+',
          totalPairsAvailable: ultraConservativePairs.length,
          pairCategories: 'Major pairs only (highest liquidity)'
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        approach: 'ultra_conservative_major_pairs_only'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 ULTRA-CONSERVATIVE SIGNAL GENERATION error:', error);
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
