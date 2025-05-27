
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
    const isCronTriggered = body.trigger === 'cron' || body.automatic === true;
    const isTestMode = body.test_mode === true || body.trigger === 'test';
    
    console.log(`🤖 ${isCronTriggered ? 'AUTOMATIC CRON' : 'MANUAL'} AI signal generation starting...`);
    console.log(`🧪 Test mode: ${isTestMode ? 'ENABLED' : 'DISABLED'}`);
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

    // PHASE 1: Check and expire signals based on outcomes, not time
    console.log('🎯 Phase 1: Checking signal outcomes for expiration...');
    await checkAndExpireSignalsByOutcome(supabase);

    // Check current active signals count
    const { data: existingSignals, error: countError } = await supabase
      .from('trading_signals')
      .select('id, symbol, created_at, status')
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

    // PHASE 2: Only generate new signals if we have fewer than 6 active signals (for automatic mode)
    const maxActiveSignals = isCronTriggered ? 6 : 20; // Conservative for automatic, liberal for manual
    if (isCronTriggered && existingSignals && existingSignals.length >= maxActiveSignals) {
      console.log(`⏸️ Automatic mode: ${existingSignals.length} active signals >= ${maxActiveSignals} limit. Skipping generation.`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Automatic mode: Sufficient active signals (${existingSignals.length}/${maxActiveSignals})`,
          signals: [],
          skipReason: 'sufficient_active_signals',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    if (marketData && marketData.length > 0) {
      console.log('📊 Available market data:');
      marketData.slice(0, 5).forEach(data => {
        console.log(`  - ${data.symbol}: ${data.current_price} (${data.last_update})`);
      });
    }

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

    // ALL AVAILABLE CURRENCY PAIRS - Focus on major pairs for automatic mode
    const allCurrencyPairs = isCronTriggered ? [
      // Major pairs only for automatic generation
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'
    ] : [
      // All pairs for manual generation
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY'
    ];
    
    console.log(`🌍 ${isCronTriggered ? 'AUTOMATIC' : 'MANUAL'} ANALYSIS: Analyzing ${allCurrencyPairs.length} currency pairs`);
    
    // Get latest price for each currency pair from centralized market state
    const latestPrices = new Map();
    
    for (const pair of allCurrencyPairs) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
        console.log(`📊 Found centralized data for ${pair}: ${pairData.current_price} (updated: ${pairData.last_update})`);
      } else {
        console.log(`⚠️ No centralized data found for ${pair}`);
      }
    }

    console.log(`🎯 Will generate signals for ${latestPrices.size} pairs with available data (out of ${allCurrencyPairs.length} total pairs)`);

    if (latestPrices.size === 0) {
      console.error('❌ No market data available for any currency pairs');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No market data available for signal generation', 
          signals: [],
          availablePairs: [],
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signals = [];
    const timestamp = new Date().toISOString();

    // For automatic mode, don't clear existing signals - just add new ones
    if (!isCronTriggered) {
      console.log('🔄 Manual trigger: clearing existing active signals...');
      
      const { error: deleteError } = await supabase
        .from('trading_signals')
        .delete()
        .eq('is_centralized', true)
        .is('user_id', null)
        .eq('status', 'active');

      if (deleteError) {
        console.error('❌ Error clearing existing signals:', deleteError);
      } else {
        console.log('✅ Cleared existing active centralized signals for manual generation');
      }
    }

    // Generate AI-powered signals
    let successfulSignals = 0;
    let neutralSignals = 0;
    let errorCount = 0;

    console.log(`🚀 Starting AI analysis for ${allCurrencyPairs.length} currency pairs...`);

    // For automatic mode, be more liberal with signal generation
    const targetSignalCount = isCronTriggered ? 2 : 8; // Generate fewer for automatic, more for manual

    for (const pair of allCurrencyPairs) {
      // Stop generating if we've reached our target for automatic mode
      if (isCronTriggered && successfulSignals >= targetSignalCount) {
        console.log(`✅ Automatic mode: Reached target of ${targetSignalCount} signals, stopping generation`);
        break;
      }

      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) {
        console.log(`⚠️ Skipping ${pair} - no market data available`);
        continue;
      }

      try {
        const currentPrice = parseFloat(marketPoint.current_price.toString());
        if (!currentPrice || currentPrice <= 0) {
          console.log(`❌ Invalid price for ${pair}: ${currentPrice}`);
          continue;
        }

        console.log(`🧠 Generating AI analysis for ${pair} at price ${currentPrice}... (${successfulSignals + neutralSignals + errorCount + 1}/${allCurrencyPairs.length})`);

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

        // Enhanced AI prompt - more liberal for automatic mode
        const isLiberal = isCronTriggered || isTestMode;
        console.log(`🔮 Calling OpenAI API for ${pair} analysis (${isLiberal ? 'LIBERAL' : 'CONSERVATIVE'} mode)...`);
        
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
                content: `You are a professional forex trading analyst. ${isLiberal ? 'LIBERAL MODE: Generate signals more liberally. Lower your thresholds for signal generation.' : ''} Analyze the provided market data and generate trading signal recommendations for ${pair}.
                
                Respond with a JSON object containing:
                {
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between ${isLiberal ? '50-85' : '70-90'} (${isLiberal ? 'liberal mode - more signals' : 'conservative mode'}),
                  "entry_price": number (current price adjusted for optimal entry),
                  "stop_loss_pips": number between 15-40,
                  "take_profit_pips": [number, number, number] (3 levels, progressive),
                  "analysis": "detailed explanation of the signal reasoning including technical indicators and market context",
                  "risk_level": "LOW", "MEDIUM", or "HIGH"
                }
                
                ${isLiberal ? `
                LIBERAL MODE INSTRUCTIONS:
                - Be MORE willing to generate BUY/SELL signals (aim for 70-80% signal rate vs neutral)
                - Lower your conviction requirements for signal generation
                - Focus on moderate-confidence opportunities (50-85% confidence range)
                - Generate signals even for smaller price movements or less clear patterns
                - This ensures continuous signal availability for users
                ` : `
                CONSERVATIVE MODE:
                - Only generate BUY/SELL signals when you have strong conviction
                - Use NEUTRAL when market conditions are unclear or conflicting
                - Be selective with signal generation to maintain high quality
                `}
                
                Consider:
                - Technical patterns and price action for ${pair}
                - Market momentum and volatility
                - Support/resistance levels
                - Currency pair characteristics (major/cross pair behavior)
                - Current market session timing
                - Risk management principles`
              },
              {
                role: 'user',
                content: `Analyze ${pair} trading data:
                Current Price: ${currentPrice}
                Recent Prices: ${priceHistory.join(', ')}
                24h Change: ${priceChange.toFixed(2)}%
                Market Timestamp: ${timestamp}
                Session: ${new Date().getUTCHours() >= 12 && new Date().getUTCHours() < 20 ? 'US Trading Hours' : 'Outside US Hours'}
                Pair Type: ${['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'].includes(pair) ? 'Major Pair' : 'Cross Pair'}
                Generation Mode: ${isLiberal ? 'LIBERAL - Generate more signals' : 'CONSERVATIVE - High quality only'}
                
                Generate a trading signal with specific entry, stop loss, and take profit levels. ${isLiberal ? 'Since this is liberal mode, be more willing to generate actionable signals.' : 'Only issue signals when you have strong conviction.'}`
              }
            ],
            max_tokens: 800,
            temperature: isLiberal ? 0.7 : 0.3 // Higher temperature in liberal mode for more varied responses
          }),
        });

        if (!aiAnalysisResponse.ok) {
          console.error(`❌ OpenAI API error for ${pair}: ${aiAnalysisResponse.status} ${aiAnalysisResponse.statusText}`);
          const errorText = await aiAnalysisResponse.text();
          console.error('OpenAI Error Details:', errorText);
          errorCount++;
          continue;
        }

        const aiData = await aiAnalysisResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content;

        if (!aiContent) {
          console.error(`❌ No AI response content for ${pair}`);
          errorCount++;
          continue;
        }

        console.log(`🤖 Raw AI response for ${pair}:`, aiContent.substring(0, 200) + '...');

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
          console.log(`📝 Full AI response for debugging: ${aiContent}`);
          errorCount++;
          continue;
        }

        // Validate AI signal
        if (!aiSignal.signal) {
          console.log(`⚠️ AI response missing signal field for ${pair}`);
          errorCount++;
          continue;
        }

        console.log(`📊 AI Decision for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence)`);
        console.log(`📝 Reasoning: ${aiSignal.analysis?.substring(0, 150)}...`);

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚠️ AI recommended ${aiSignal.signal} signal for ${pair}, skipping`);
          neutralSignals++;
          continue;
        }

        // Validate confidence range based on mode
        const minConfidence = isLiberal ? 50 : 70;
        const maxConfidence = isLiberal ? 85 : 90;
        
        if (aiSignal.confidence < minConfidence || aiSignal.confidence > maxConfidence) {
          console.log(`⚠️ AI confidence ${aiSignal.confidence}% outside range ${minConfidence}-${maxConfidence}% for ${pair}`);
          aiSignal.confidence = Math.min(Math.max(aiSignal.confidence, minConfidence), maxConfidence);
          console.log(`🔧 Adjusted confidence to ${aiSignal.confidence}% for ${pair}`);
        }

        console.log(`✅ AI generated ${aiSignal.signal} signal for ${pair} with ${aiSignal.confidence}% confidence`);

        // Calculate price levels based on AI recommendations
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
          confidence: Math.min(Math.max(aiSignal.confidence || (isLiberal ? 60 : 75), minConfidence), maxConfidence),
          status: 'active',
          is_centralized: true,
          user_id: null,
          analysis_text: `${isLiberal ? '[AUTO] ' : ''}AI-Generated ${aiSignal.signal} Signal for ${pair}: ${aiSignal.analysis || 'Advanced technical analysis indicates favorable conditions.'}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: timestamp
        };

        signals.push(signal);
        successfulSignals++;
        console.log(`✅ Generated AI-powered ${aiSignal.signal} signal for ${pair} (${aiSignal.confidence}% confidence) - ${successfulSignals} total signals`);

        // Add small delay between AI calls to avoid rate limiting
        if (allCurrencyPairs.indexOf(pair) < allCurrencyPairs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

      } catch (error) {
        console.error(`❌ Error generating AI signal for ${pair}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 ${isCronTriggered ? 'AUTOMATIC' : 'MANUAL'} SIGNAL GENERATION SUMMARY:`);
    console.log(`  - Total pairs analyzed: ${allCurrencyPairs.length}`);
    console.log(`  - Pairs with market data: ${latestPrices.size}`);
    console.log(`  - Successful signals: ${successfulSignals}`);
    console.log(`  - Neutral signals: ${neutralSignals}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Signal success rate: ${((successfulSignals / latestPrices.size) * 100).toFixed(1)}%`);
    console.log(`  - Mode: ${isCronTriggered ? 'AUTOMATIC' : 'MANUAL'}`);

    if (signals.length === 0) {
      console.log(`⚠️ No AI signals generated from any of the analyzed pairs`);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `No AI signals generated from ${allCurrencyPairs.length} analyzed pairs - ${neutralSignals} neutral signals, ${errorCount} errors`, 
          signals: [],
          marketDataCount: marketData?.length || 0,
          availablePairs: Array.from(latestPrices.keys()),
          stats: {
            totalPairsAnalyzed: allCurrencyPairs.length,
            pairsWithData: latestPrices.size,
            successful: successfulSignals,
            neutral: neutralSignals,
            errors: errorCount,
            mode: isCronTriggered ? 'automatic' : 'manual'
          },
          timestamp
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new AI-generated signals
    console.log(`💾 Inserting ${signals.length} new AI-generated centralized signals...`);
    const { data: insertedSignals, error: insertError } = await supabase
      .from('trading_signals')
      .insert(signals)
      .select('*');

    if (insertError) {
      console.error('❌ Error inserting AI signals:', insertError);
      throw insertError;
    }

    console.log(`🎉 SUCCESS! Generated ${signals.length} AI-powered centralized signals ${isCronTriggered ? '(AUTOMATIC)' : '(MANUAL)'}`);
    insertedSignals?.forEach(signal => {
      console.log(`  - ${signal.symbol} ${signal.type} @ ${signal.price} (${signal.confidence}% confidence)`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signals.length} AI-powered centralized signals ${isCronTriggered ? '(AUTOMATIC)' : '(MANUAL)'}`,
        signals: insertedSignals?.map(s => ({ 
          id: s.id, 
          symbol: s.symbol, 
          type: s.type, 
          price: s.price,
          confidence: s.confidence 
        })) || [],
        marketDataUsed: Array.from(latestPrices.keys()),
        stats: {
          totalPairsAnalyzed: allCurrencyPairs.length,
          pairsWithData: latestPrices.size,
          successful: successfulSignals,
          neutral: neutralSignals,
          errors: errorCount,
          signalSuccessRate: `${((successfulSignals / latestPrices.size) * 100).toFixed(1)}%`,
          mode: isCronTriggered ? 'automatic' : 'manual'
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        aiPowered: true,
        automaticGeneration: isCronTriggered
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 AI signal generation error:', error);
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

// Helper function to check and expire signals based on outcomes
async function checkAndExpireSignalsByOutcome(supabase: any) {
  try {
    console.log('🎯 Checking signal outcomes for expiration...');
    
    // Get all active signals
    const { data: activeSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('status', 'active')
      .eq('is_centralized', true);

    if (signalsError || !activeSignals?.length) {
      console.log('📭 No active signals to check for outcomes');
      return;
    }

    console.log(`🔍 Checking ${activeSignals.length} active signals for outcomes...`);

    // Get current market prices for all signal pairs
    const symbols = [...new Set(activeSignals.map(s => s.symbol))];
    const { data: currentPrices, error: priceError } = await supabase
      .from('centralized_market_state')
      .select('symbol, current_price')
      .in('symbol', symbols);

    if (priceError || !currentPrices?.length) {
      console.log('⚠️ No current price data available for outcome checking');
      return;
    }

    // Create price lookup
    const priceMap = new Map();
    currentPrices.forEach(price => {
      priceMap.set(price.symbol, parseFloat(price.current_price.toString()));
    });

    let outcomesDetected = 0;

    // Check each signal for outcomes
    for (const signal of activeSignals) {
      const currentPrice = priceMap.get(signal.symbol);
      if (!currentPrice) continue;

      const entryPrice = parseFloat(signal.price.toString());
      const stopLoss = parseFloat(signal.stop_loss.toString());
      const takeProfits = signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [];

      let outcomeDetected = false;
      let hitTarget = false;
      let targetLevel = 0;
      let exitPrice = currentPrice;

      // Check stop loss
      if (signal.type === 'BUY') {
        if (currentPrice <= stopLoss) {
          outcomeDetected = true;
          exitPrice = stopLoss;
        }
      } else {
        if (currentPrice >= stopLoss) {
          outcomeDetected = true;
          exitPrice = stopLoss;
        }
      }

      // Check take profits (only if stop loss not hit)
      if (!outcomeDetected && takeProfits.length > 0) {
        for (let i = 0; i < takeProfits.length; i++) {
          const tpPrice = takeProfits[i];
          let tpHit = false;
          
          if (signal.type === 'BUY') {
            tpHit = currentPrice >= tpPrice;
          } else {
            tpHit = currentPrice <= tpPrice;
          }
          
          if (tpHit) {
            outcomeDetected = true;
            hitTarget = true;
            targetLevel = i + 1;
            exitPrice = tpPrice;
            break;
          }
        }
      }

      // Process outcome if detected
      if (outcomeDetected) {
        console.log(`🎯 Outcome detected for ${signal.symbol}: ${hitTarget ? `TP${targetLevel} HIT` : 'STOP LOSS HIT'}`);
        
        // Calculate P&L in pips
        let pnlPips = 0;
        if (signal.type === 'BUY') {
          pnlPips = Math.round((exitPrice - entryPrice) * 10000);
        } else {
          pnlPips = Math.round((entryPrice - exitPrice) * 10000);
        }

        // Create signal outcome record
        const { error: outcomeError } = await supabase
          .from('signal_outcomes')
          .insert({
            signal_id: signal.id,
            hit_target: hitTarget,
            exit_price: exitPrice,
            target_hit_level: hitTarget ? targetLevel : null,
            pnl_pips: pnlPips,
            notes: hitTarget ? `Take Profit ${targetLevel} Hit` : 'Stop Loss Hit'
          });

        if (outcomeError) {
          console.error(`❌ Error creating outcome for ${signal.symbol}:`, outcomeError);
          continue;
        }

        // Update signal status to expired
        const { error: updateError } = await supabase
          .from('trading_signals')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', signal.id);

        if (updateError) {
          console.error(`❌ Error updating signal status for ${signal.symbol}:`, updateError);
          continue;
        }

        outcomesDetected++;
        console.log(`✅ Signal ${signal.symbol} expired with outcome: ${hitTarget ? 'WIN' : 'LOSS'} (${pnlPips} pips)`);
      }
    }

    console.log(`✅ Outcome check complete: ${outcomesDetected} signals expired based on outcomes`);
    
  } catch (error) {
    console.error('❌ Error in outcome-based signal expiration:', error);
  }
}
