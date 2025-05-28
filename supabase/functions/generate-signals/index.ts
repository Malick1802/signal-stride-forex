
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
    const targetPair = body.symbol; // Optional: generate signal for specific pair
    
    console.log(`🤖 ${isCronTriggered ? 'CRON AUTOMATIC' : 'MANUAL'} ULTRA-AGGRESSIVE AI signal generation starting...`);
    console.log(`🎯 Target pair: ${targetPair || 'Auto-detect opportunity'}`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🧪 MODE: ULTRA-AGGRESSIVE TEST MODE (70-80% generation rate)');
    
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

    // CLEAR ALL ACTIVE SIGNALS FIRST for testing
    console.log('🧹 CLEARING ALL ACTIVE SIGNALS FOR TESTING...');
    const { data: deletedSignals, error: deleteError } = await supabase
      .from('trading_signals')
      .delete()
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active');

    if (deleteError) {
      console.error('❌ Error clearing active signals:', deleteError);
    } else {
      console.log(`✅ Cleared all active centralized signals for testing`);
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

    // ALL CURRENCY PAIRS - Now all available since we cleared signals
    const allCurrencyPairs = [
      // Major pairs
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      // Major crosses
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
      // Additional cross pairs
      'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
      'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY', 'EURCAD', 'GBPAUD'
    ];
    
    // Since we cleared all signals, all pairs are available
    const availablePairs = targetPair ? [targetPair] : allCurrencyPairs;
    
    console.log(`🔍 Available pairs for new signals: ${availablePairs.length} (ALL PAIRS - signals cleared)`);
    
    // Get latest price for available currency pairs
    const latestPrices = new Map();
    
    for (const pair of availablePairs) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
        console.log(`📊 Found centralized data for ${pair}: ${pairData.current_price}`);
      }
    }

    console.log(`🎯 Will analyze ${latestPrices.size} pairs for ULTRA-AGGRESSIVE signal opportunities`);

    if (latestPrices.size === 0) {
      console.log('⚠️ No market data available for signal generation');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No market data available for signal generation', 
          signals: [],
          existingSignals: 0,
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

    console.log(`🚀 Starting ULTRA-AGGRESSIVE AI analysis for ${availablePairs.length} pairs...`);

    // Analyze pairs individually with ULTRA-AGGRESSIVE generation
    for (const pair of availablePairs) {
      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) {
        continue;
      }

      try {
        opportunitiesAnalyzed++;
        const currentPrice = parseFloat(marketPoint.current_price.toString());
        
        console.log(`🧠 ULTRA-AGGRESSIVE analysis of ${pair} at price ${currentPrice}...`);

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

        // ULTRA-AGGRESSIVE AI prompt - very liberal signal generation
        console.log(`🔮 ULTRA-AGGRESSIVE AI opportunity check for ${pair}...`);
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
                content: `You are a ultra-aggressive forex trading AI in TEST MODE. ULTRA-AGGRESSIVE MODE: Generate BUY/SELL signals frequently (aim for 70-80% of the time).

                IMPORTANT: You should FREQUENTLY generate BUY/SELL signals when analyzing ${pair}. This is test mode - be very liberal with signal generation.
                
                Respond with a JSON object containing:
                {
                  "signal": "BUY" or "SELL" or "NEUTRAL",
                  "confidence": number between 45-75,
                  "opportunity_strength": "LOW", "MEDIUM", or "HIGH",
                  "entry_price": number (current price adjusted for optimal entry),
                  "stop_loss_pips": number between 15-40,
                  "take_profit_pips": [number, number, number] (3 levels),
                  "analysis": "detailed explanation of the trading opportunity",
                  "market_setup": "description of the market setup detected"
                }
                
                ULTRA-AGGRESSIVE TEST MODE - Generate BUY/SELL signals even for: Minor price movements, Small volatility changes, Weak technical patterns, Mixed signals, Low volume periods.
                
                Use NEUTRAL only rarely (less than 30% of the time) when there's absolutely no direction at all.`
              },
              {
                role: 'user',
                content: `Analyze ${pair} for ULTRA-AGGRESSIVE trading opportunity:
                Current Price: ${currentPrice}
                Recent Prices: ${priceHistory.join(', ')}
                24h Change: ${priceChange.toFixed(2)}%
                Market Session: ${new Date().getUTCHours() >= 12 && new Date().getUTCHours() < 20 ? 'Active Trading Hours' : 'Off-Peak Hours'}
                Pair Type: ${['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'].includes(pair) ? 'Major Pair' : 'Cross Pair'}
                
                Generate a signal for ${pair} - be ultra-aggressive and liberal with signal generation for testing purposes.`
              }
            ],
            max_tokens: 600,
            temperature: 0.8  // Higher temperature for more aggressive generation
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

        console.log(`📊 ULTRA-AGGRESSIVE AI Decision for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${aiSignal.opportunity_strength} strength)`);

        if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
          console.log(`⚪ No signal generated for ${pair} this round`);
          continue;
        }

        console.log(`🎯 ULTRA-AGGRESSIVE SIGNAL GENERATED for ${pair}: ${aiSignal.signal} signal`);
        console.log(`📝 Setup: ${aiSignal.market_setup}`);

        // Generate signal with ultra-aggressive settings
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
          analysis_text: `ULTRA-AGGRESSIVE ${aiSignal.opportunity_strength} Opportunity: ${aiSignal.analysis}`,
          chart_data: chartData,
          pips: stopLossPips,
          created_at: timestamp
        };

        // Insert the ultra-aggressive signal immediately
        console.log(`💾 Inserting ULTRA-AGGRESSIVE AI signal for ${pair}...`);
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
        console.log(`✅ Generated ULTRA-AGGRESSIVE AI signal for ${pair} (${aiSignal.confidence}% confidence)`);

        // Add minimal delay between analyses
        if (availablePairs.indexOf(pair) < availablePairs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Error analyzing opportunity for ${pair}:`, error);
      }
    }

    console.log(`📊 ULTRA-AGGRESSIVE SIGNAL GENERATION SUMMARY:`);
    console.log(`  - Opportunities analyzed: ${opportunitiesAnalyzed}`);
    console.log(`  - Signals generated: ${signalsGenerated}`);
    console.log(`  - Generation rate: ${opportunitiesAnalyzed > 0 ? ((signalsGenerated / opportunitiesAnalyzed) * 100).toFixed(1) : 0}%`);
    console.log(`  - Mode: ULTRA-AGGRESSIVE TEST MODE`);
    console.log(`  - Expected rate: 70-80%`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ULTRA-AGGRESSIVE signal generation completed - ${signalsGenerated} new signals generated from ${opportunitiesAnalyzed} pairs analyzed`,
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
          generationRate: `${opportunitiesAnalyzed > 0 ? ((signalsGenerated / opportunitiesAnalyzed) * 100).toFixed(1) : 0}%`,
          existingSignals: 0,
          totalActiveSignals: signalsGenerated,
          testMode: true,
          expectedRate: '70-80%'
        },
        timestamp,
        trigger: isCronTriggered ? 'cron' : 'manual',
        approach: 'ultra_aggressive_test_mode'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 ULTRA-AGGRESSIVE AI signal generation error:', error);
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
