
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
    
    console.log(`🤖 ${isCronTriggered ? 'CRON AUTOMATIC' : 'MANUAL'} AI-powered signal generation starting...`);
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

    // Priority currency pairs for signal generation
    const priorityPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
    
    // Get latest price for each priority pair from centralized market state
    const latestPrices = new Map();
    
    for (const pair of priorityPairs) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
        console.log(`📊 Found centralized data for ${pair}: ${pairData.current_price} (updated: ${pairData.last_update})`);
      } else {
        console.log(`⚠️ No centralized data found for ${pair}`);
      }
    }

    console.log(`🎯 Will generate signals for ${latestPrices.size} pairs with available data`);

    if (latestPrices.size === 0) {
      console.error('❌ No market data available for any priority pairs');
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

    // For cron triggers, only clean up very old signals to avoid conflicts
    if (isCronTriggered) {
      console.log('🔄 Cron trigger: cleaning up old expired signals...');
      
      const { error: deleteError } = await supabase
        .from('trading_signals')
        .delete()
        .eq('is_centralized', true)
        .is('user_id', null)
        .eq('status', 'expired')
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (deleteError) {
        console.error('❌ Error deleting old signals:', deleteError);
      } else {
        console.log('✅ Cleaned up old expired signals (7+ days)');
      }
    } else {
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

    // Generate AI-powered signals for each priority pair with available data
    let successfulSignals = 0;
    let neutralSignals = 0;
    let errorCount = 0;

    for (const pair of priorityPairs) {
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

        console.log(`🧠 Generating AI analysis for ${pair} at price ${currentPrice}...`);

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

        // Call OpenAI for market analysis and signal generation
        console.log(`🔮 Calling OpenAI API for ${pair} analysis...`);
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
                content: `You are a professional forex trading analyst. Analyze the provided market data and generate a trading signal recommendation. 
                
                Respond with a JSON object containing:
                {
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between 75-95,
                  "entry_price": number (current price adjusted for optimal entry),
                  "stop_loss_pips": number between 15-40,
                  "take_profit_pips": [number, number, number] (3 levels, progressive),
                  "analysis": "detailed explanation of the signal reasoning",
                  "risk_level": "LOW", "MEDIUM", or "HIGH"
                }
                
                Base your analysis on technical patterns, price action, and market momentum. Only generate BUY/SELL signals when confident. Use NEUTRAL for unclear market conditions. For this session, try to be more decisive and generate actionable signals when possible.`
              },
              {
                role: 'user',
                content: `Analyze ${pair} trading data:
                Current Price: ${currentPrice}
                Recent Prices: ${priceHistory.join(', ')}
                24h Change: ${priceChange.toFixed(2)}%
                Market Timestamp: ${timestamp}
                Session: ${new Date().getUTCHours() >= 12 && new Date().getUTCHours() < 20 ? 'US Trading Hours' : 'Outside US Hours'}
                
                Generate a trading signal with specific entry, stop loss, and take profit levels. Be decisive in your analysis.`
              }
            ],
            max_tokens: 800,
            temperature: 0.4 // Slightly higher temperature for more varied responses
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
          console.log('AI Response:', aiContent);
          errorCount++;
          continue;
        }

        // Validate AI signal
        if (!aiSignal.signal) {
          console.log(`⚠️ AI response missing signal field for ${pair}`);
          errorCount++;
          continue;
        }

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚠️ AI recommended ${aiSignal.signal} signal for ${pair}, skipping`);
          neutralSignals++;
          continue;
        }

        console.log(`✅ AI generated ${aiSignal.signal} signal for ${pair} with ${aiSignal.confidence}% confidence`);
        console.log(`📝 Analysis: ${aiSignal.analysis?.substring(0, 100)}...`);

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
          confidence: Math.min(Math.max(aiSignal.confidence || 85, 75), 95),
          status: 'active',
          is_centralized: true,
          user_id: null,
          analysis_text: `AI-Generated ${aiSignal.signal} Signal: ${aiSignal.analysis || 'Advanced technical analysis indicates favorable conditions.'}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: timestamp
        };

        signals.push(signal);
        successfulSignals++;
        console.log(`✅ Generated AI-powered ${aiSignal.signal} signal for ${pair} (${aiSignal.confidence}% confidence)`);

      } catch (error) {
        console.error(`❌ Error generating AI signal for ${pair}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 Signal generation summary:`);
    console.log(`  - Successful signals: ${successfulSignals}`);
    console.log(`  - Neutral signals: ${neutralSignals}`);
    console.log(`  - Errors: ${errorCount}`);

    if (signals.length === 0) {
      console.log('⚠️ No AI signals generated - market conditions may be unclear or all signals were neutral');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `No AI signals generated - ${neutralSignals} neutral signals, ${errorCount} errors`, 
          signals: [],
          marketDataCount: marketData?.length || 0,
          availablePairs: Array.from(latestPrices.keys()),
          stats: {
            successful: successfulSignals,
            neutral: neutralSignals,
            errors: errorCount
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

    console.log(`🎉 SUCCESS! Generated ${signals.length} AI-powered centralized signals`);
    insertedSignals?.forEach(signal => {
      console.log(`  - ${signal.symbol} ${signal.type} @ ${signal.price} (${signal.confidence}% confidence)`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signals.length} AI-powered centralized signals`,
        signals: insertedSignals?.map(s => ({ 
          id: s.id, 
          symbol: s.symbol, 
          type: s.type, 
          price: s.price,
          confidence: s.confidence 
        })) || [],
        marketDataUsed: Array.from(latestPrices.keys()),
        stats: {
          successful: successfulSignals,
          neutral: neutralSignals,
          errors: errorCount
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        aiPowered: true
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
