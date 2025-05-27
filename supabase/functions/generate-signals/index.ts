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
    
    console.log(`🤖 ${isCronTriggered ? 'Automatic cron' : 'Manual'} AI-powered signal generation...`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured - required for AI signal generation');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recent centralized market data from FastForex
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(50);

    if (marketError) {
      console.error('❌ Error fetching centralized market data:', marketError);
      throw marketError;
    }

    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No centralized market data available, triggering market update first...');
      
      try {
        await supabase.functions.invoke('centralized-market-stream');
        console.log('✅ Market data update triggered, waiting for data...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data: retryData } = await supabase
          .from('centralized_market_state')
          .select('*')
          .order('last_update', { ascending: false })
          .limit(10);
          
        if (!retryData || retryData.length === 0) {
          console.log('⚠️ Still no market data available');
          return new Response(
            JSON.stringify({ message: 'No market data available', signals: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
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
        console.log(`📊 Found centralized data for ${pair}: ${pairData.current_price}`);
      }
    }

    const signals = [];
    const timestamp = new Date().toISOString();

    // For automatic generation, only remove stale signals (older than 7 days) with outcomes
    if (isCronTriggered) {
      console.log('🔄 Automatic generation: cleaning up old completed signals');
      
      // Only delete signals older than 7 days that already have outcomes recorded
      const { error: deleteError } = await supabase
        .from('trading_signals')
        .delete()
        .eq('is_centralized', true)
        .is('user_id', null)
        .eq('status', 'expired')
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (deleteError) {
        console.error('❌ Error deleting old completed signals:', deleteError);
      } else {
        console.log('✅ Cleaned up old completed signals (7+ days with outcomes)');
      }

      // Clean up very old active signals (14+ days) as safety mechanism - mark as expired with outcome
      const { data: staleSignals } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('is_centralized', true)
        .is('user_id', null)
        .eq('status', 'active')
        .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (staleSignals && staleSignals.length > 0) {
        console.log(`⚠️ Found ${staleSignals.length} stale signals (14+ days), marking as expired with timeout outcome`);
        
        for (const staleSignal of staleSignals) {
          // Create timeout outcome
          await supabase
            .from('signal_outcomes')
            .insert({
              signal_id: staleSignal.id,
              hit_target: false,
              exit_price: staleSignal.price, // Use entry price as exit price for timeout
              target_hit_level: null,
              pnl_pips: 0, // No profit/loss for timeout
              notes: 'Signal expired due to timeout (14+ days with no outcome)'
            });

          // Mark signal as expired
          await supabase
            .from('trading_signals')
            .update({ 
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', staleSignal.id);
        }
        
        console.log('✅ Processed stale signals with timeout outcomes');
      }
    } else {
      // For manual generation, check if we have recent signals
      const { data: existingSignals } = await supabase
        .from('trading_signals')
        .select('id, created_at')
        .eq('is_centralized', true)
        .is('user_id', null)
        .eq('status', 'active')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      if (existingSignals && existingSignals.length >= 5) {
        console.log(`✅ Found ${existingSignals.length} recent centralized signals for manual request`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Using existing ${existingSignals.length} centralized signals`,
            signals: existingSignals.map(s => s.id),
            timestamp
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear existing centralized signals for manual generation
      const { error: deleteError } = await supabase
        .from('trading_signals')
        .delete()
        .eq('is_centralized', true)
        .is('user_id', null);

      if (deleteError) {
        console.error('❌ Error clearing existing signals:', deleteError);
      } else {
        console.log('✅ Cleared existing centralized signals for manual generation');
      }
    }

    // Generate AI-powered signals for each priority pair
    for (const pair of priorityPairs) {
      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) {
        console.log(`⚠️ No centralized market data for ${pair}, skipping`);
        continue;
      }

      try {
        const currentPrice = parseFloat(marketPoint.current_price.toString());
        if (!currentPrice || currentPrice <= 0) {
          console.log(`❌ Invalid price for ${pair}: ${currentPrice}`);
          continue;
        }

        console.log(`🧠 Generating AI analysis for ${pair} at price ${currentPrice}`);

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

        const marketContext = {
          symbol: pair,
          currentPrice,
          priceHistory: priceHistory.slice(0, 5), // Last 5 data points
          priceChange24h: priceChange,
          timestamp: new Date().toISOString()
        };

        // Call OpenAI for market analysis and signal generation
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
                  "confidence": number between 70-95,
                  "entry_price": number (current price adjusted for optimal entry),
                  "stop_loss_pips": number between 15-40,
                  "take_profit_pips": [number, number, number] (3 levels, progressive),
                  "analysis": "detailed explanation of the signal reasoning",
                  "risk_level": "LOW", "MEDIUM", or "HIGH"
                }
                
                Base your analysis on technical patterns, price action, and market momentum. Only generate BUY/SELL signals when confident. Use NEUTRAL for unclear market conditions.`
              },
              {
                role: 'user',
                content: `Analyze ${pair} trading data:
                Current Price: ${currentPrice}
                Recent Prices: ${priceHistory.join(', ')}
                24h Change: ${priceChange.toFixed(2)}%
                Market Timestamp: ${timestamp}
                
                Generate a trading signal with specific entry, stop loss, and take profit levels.`
              }
            ],
            max_tokens: 800,
            temperature: 0.3
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
          // Extract JSON from AI response
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiSignal = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in AI response');
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse AI response for ${pair}:`, parseError);
          console.log('AI Response:', aiContent);
          continue;
        }

        // Validate AI signal
        if (!aiSignal.signal || aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚠️ AI recommended NEUTRAL or invalid signal for ${pair}, skipping`);
          continue;
        }

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
          confidence: Math.min(Math.max(aiSignal.confidence || 85, 70), 95),
          status: 'active',
          is_centralized: true,
          user_id: null,
          analysis_text: `AI-Generated ${aiSignal.signal} Signal: ${aiSignal.analysis || 'Advanced technical analysis indicates favorable conditions.'}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: timestamp
        };

        signals.push(signal);
        console.log(`✅ Generated AI-powered ${aiSignal.signal} signal for ${pair} (${aiSignal.confidence}% confidence)`);

      } catch (error) {
        console.error(`❌ Error generating AI signal for ${pair}:`, error);
      }
    }

    if (signals.length === 0) {
      console.log('⚠️ No AI signals generated, market conditions may be unclear');
      return new Response(
        JSON.stringify({ 
          message: 'No AI signals generated - market conditions unclear', 
          signals: [],
          marketDataCount: marketData?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new AI-generated signals
    const { data: insertedSignals, error: insertError } = await supabase
      .from('trading_signals')
      .insert(signals)
      .select('*');

    if (insertError) {
      console.error('❌ Error inserting AI signals:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully generated ${signals.length} AI-powered centralized signals`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signals.length} AI-powered centralized signals`,
        signals: insertedSignals?.map(s => ({ id: s.id, symbol: s.symbol, type: s.type, confidence: s.confidence })) || [],
        marketDataUsed: Array.from(latestPrices.keys()),
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
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
