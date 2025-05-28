
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    const isTestMode = body.test_mode === true || body.trigger === 'test';
    const targetPair = body.symbol; // Optional: generate signal for specific pair
    
    console.log(`🤖 ${isCronTriggered ? 'CRON AUTOMATIC' : 'MANUAL'} Individual AI signal generation starting...`);
    console.log(`🧪 Test mode: ${isTestMode ? 'ENABLED (Lower thresholds)' : 'DISABLED (Production)'}`);
    console.log(`🎯 Target pair: ${targetPair || 'Auto-detect opportunity'}`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    
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

    // Check current active signals count
    const { data: existingSignals, error: countError } = await supabase
      .from('trading_signals')
      .select('id, symbol, created_at')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active');

    if (countError) {
      console.error('❌ Error checking existing signals:', countError);
    } else {
      console.log(`📊 Current active centralized signals: ${existingSignals?.length || 0}`);
      if (existingSignals && existingSignals.length > 0) {
        existingSignals.forEach(signal => {
          console.log(`  - ${signal.symbol} (created: ${signal.created_at})`);
        });
      }
    }

    // Get recent centralized market data from FastForex
    console.log('📈 Fetching centralized market data...');
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

    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No centralized market data available, triggering market update first...');
      
      try {
        const { error: updateError } = await supabase.functions.invoke('centralized-market-stream');
        if (updateError) {
          console.error('❌ Failed to trigger market update:', updateError);
        } else {
          console.log('✅ Market data update triggered, waiting for data...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error('❌ Failed to trigger market update:', error);
      }
    }

    // EXPANDED CURRENCY PAIRS - Now includes all 26 supported pairs
    const allCurrencyPairs = [
      // Major pairs
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      // Major crosses
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
      // Additional cross pairs
      'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
      'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY', 'EURCAD', 'GBPAUD'
    ];
    
    // Filter pairs that already have active signals to avoid duplicates
    const existingPairs = new Set(existingSignals?.map(s => s.symbol) || []);
    const availablePairs = targetPair ? [targetPair] : allCurrencyPairs.filter(pair => !existingPairs.has(pair));
    
    console.log(`🔍 Available pairs for new signals: ${availablePairs.length}`);
    console.log(`🚫 Existing pairs with active signals: ${Array.from(existingPairs).join(', ')}`);
    
    // Get latest price for available currency pairs
    const latestPrices = new Map();
    
    for (const pair of availablePairs) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
        console.log(`📊 Found centralized data for ${pair}: ${pairData.current_price}`);
      }
    }

    console.log(`🎯 Will analyze ${latestPrices.size} pairs for individual signal opportunities`);

    if (latestPrices.size === 0) {
      console.log('⚠️ No available pairs for new signals (all pairs already have active signals or no market data)');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No new signal opportunities - all pairs either have active signals or lack market data', 
          signals: [],
          existingSignals: existingSignals?.length || 0,
          availablePairs: [],
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = new Date().toISOString();
    let signalsGenerated = 0;
    let opportunitiesAnalyzed = 0;
    const generatedSignals = [];

    console.log(`🚀 Starting individual AI analysis for ${availablePairs.length} available pairs...`);

    // Analyze pairs individually and generate signals only when opportunities are detected
    for (const pair of availablePairs) {
      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) {
        continue;
      }

      try {
        opportunitiesAnalyzed++;
        const currentPrice = parseFloat(marketPoint.current_price.toString());
        
        console.log(`🧠 Analyzing ${pair} for individual opportunity at price ${currentPrice}...`);

        // Get historical price data for context
        const { data: historicalData } = await supabase
          .from('centralized_market_state')
          .select('current_price, last_update')
          .eq('symbol', pair)
          .order('last_update', { ascending: false })
          .limit(20);

        // Prepare market analysis context for AI
        const priceHistory = historicalData?.map(d => parseFloat(d.current_price.toString())).slice(0, 10) || [currentPrice];
        const priceChange = priceHistory.length > 1 ? 
          ((currentPrice - priceHistory[priceHistory.length - 1]) / priceHistory[priceHistory.length - 1] * 100) : 0;

        // AI prompt focused on individual opportunity detection
        console.log(`🔮 Checking for AI opportunity in ${pair}...`);
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
                content: `You are a professional forex trading analyst focused on INDIVIDUAL OPPORTUNITY DETECTION. ${isTestMode ? 'TESTING MODE: Be more liberal with signal generation for testing.' : 'PRODUCTION MODE: Only generate signals when you detect genuine trading opportunities.'} 

                IMPORTANT: You should ONLY generate BUY/SELL signals when you detect a GENUINE trading opportunity for ${pair}. Most of the time, you should return NEUTRAL (no opportunity detected).

                ${isTestMode ? 'In testing mode, generate signals about 30% of the time when asked.' : 'In production mode, only generate signals when you have strong conviction about a trading opportunity (roughly 10-15% of the time).'}
                
                Respond with a JSON object containing:
                {
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between ${isTestMode ? '60-85' : '75-90'},
                  "opportunity_strength": "LOW", "MEDIUM", or "HIGH",
                  "entry_price": number (current price adjusted for optimal entry),
                  "stop_loss_pips": number between 15-40,
                  "take_profit_pips": [number, number, number] (3 levels),
                  "analysis": "detailed explanation focusing on why this is a trading opportunity",
                  "market_setup": "description of the specific market setup detected"
                }
                
                Only generate BUY/SELL when you detect:
                - Clear technical patterns (breakouts, reversals, etc.)
                - Strong momentum or volatility
                - Significant support/resistance levels being tested
                - Currency-specific fundamental factors
                
                Use NEUTRAL when:
                - Market is ranging/sideways
                - No clear technical setup
                - Mixed or unclear signals
                - Low volatility with no clear direction`
              },
              {
                role: 'user',
                content: `Analyze ${pair} for individual trading opportunity:
                Current Price: ${currentPrice}
                Recent Prices: ${priceHistory.join(', ')}
                24h Change: ${priceChange.toFixed(2)}%
                Market Session: ${new Date().getUTCHours() >= 12 && new Date().getUTCHours() < 20 ? 'Active Trading Hours' : 'Off-Peak Hours'}
                Pair Type: ${['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'].includes(pair) ? 'Major Pair' : 'Cross Pair'}
                
                Detect if there's a genuine trading opportunity for ${pair} right now. Only generate a signal if you see a clear setup. ${isTestMode ? 'Testing mode active - be more generous with opportunities.' : 'Production mode - be selective.'}`
              }
            ],
            max_tokens: 600,
            temperature: isTestMode ? 0.7 : 0.4
          }),
        });

        if (!aiAnalysisResponse.ok) {
          console.error(`❌ OpenAI API error for ${pair}: ${aiAnalysisResponse.status}`);
          continue;
        }

        const aiData = await aiAnalysisResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content;

        if (!aiContent) {
          console.error(`❌ No AI response content for ${pair}`);
          continue;
        }

        // Parse AI response
        let aiSignal;
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiSignal = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in AI response');
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse AI response for ${pair}:`, parseError);
          continue;
        }

        console.log(`📊 AI Decision for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.opportunity_strength} strength)`);

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚪ No opportunity detected for ${pair} - continuing monitoring`);
          continue;
        }

        console.log(`🎯 OPPORTUNITY DETECTED for ${pair}: ${aiSignal.signal} signal`);
        console.log(`📝 Setup: ${aiSignal.market_setup}`);

        // Generate signal only when opportunity is detected
        const entryPrice = aiSignal.entry_price || currentPrice;
        const stopLossPips = aiSignal.stop_loss_pips || 25;
        const takeProfitPips = aiSignal.take_profit_pips || [20, 35, 50];

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
          analysis_text: `${isTestMode ? '[TEST] ' : ''}AI-Detected ${aiSignal.opportunity_strength} Opportunity: ${aiSignal.analysis}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: timestamp
        };

        // Insert the individual signal immediately
        console.log(`💾 Inserting individual AI signal for ${pair}...`);
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
        console.log(`✅ Generated individual AI signal for ${pair} (${aiSignal.confidence}% confidence)`);

        // Add delay between analyses to avoid rate limiting and make it more realistic
        if (availablePairs.indexOf(pair) < availablePairs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // For cron triggers, only generate 1-2 signals per run to be realistic
        if (isCronTriggered && signalsGenerated >= 2) {
          console.log(`⏰ Cron trigger: Generated ${signalsGenerated} signals, stopping for this cycle`);
          break;
        }

      } catch (error) {
        console.error(`❌ Error analyzing opportunity for ${pair}:`, error);
      }
    }

    console.log(`📊 INDIVIDUAL SIGNAL GENERATION SUMMARY:`);
    console.log(`  - Opportunities analyzed: ${opportunitiesAnalyzed}`);
    console.log(`  - Signals generated: ${signalsGenerated}`);
    console.log(`  - Detection rate: ${opportunitiesAnalyzed > 0 ? ((signalsGenerated / opportunitiesAnalyzed) * 100).toFixed(1) : 0}%`);
    console.log(`  - Mode: ${isTestMode ? 'TEST (More opportunities)' : 'PRODUCTION (Selective)'}`);
    console.log(`  - Total active signals: ${(existingSignals?.length || 0) + signalsGenerated}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Individual signal generation completed - ${signalsGenerated} new opportunities detected from ${opportunitiesAnalyzed} pairs analyzed`,
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
          detectionRate: `${opportunitiesAnalyzed > 0 ? ((signalsGenerated / opportunitiesAnalyzed) * 100).toFixed(1) : 0}%`,
          existingSignals: existingSignals?.length || 0,
          totalActiveSignals: (existingSignals?.length || 0) + signalsGenerated,
          testMode: isTestMode
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        approach: 'individual_opportunity_detection'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Individual AI signal generation error:', error);
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
