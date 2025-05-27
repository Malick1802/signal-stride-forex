
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
    console.log('🧪 COMPREHENSIVE Testing signal generation system...');
    
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
      throw new Error('OpenAI API key not configured - required for AI signal generation');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Test OpenAI API directly
    console.log('🤖 Testing OpenAI API connection...');
    try {
      const openAITestResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are a test assistant. Respond with exactly: {"test": "success"}'
            },
            {
              role: 'user',
              content: 'Test connection'
            }
          ],
          max_tokens: 50,
          temperature: 0
        }),
      });

      if (!openAITestResponse.ok) {
        console.error('❌ OpenAI API test failed:', openAITestResponse.status, openAITestResponse.statusText);
        const errorText = await openAITestResponse.text();
        console.error('OpenAI Error Details:', errorText);
      } else {
        const testData = await openAITestResponse.json();
        console.log('✅ OpenAI API connection successful');
        console.log('Test response:', testData.choices?.[0]?.message?.content);
      }
    } catch (openAIError) {
      console.error('❌ OpenAI API connection error:', openAIError);
    }

    // Step 2: Check market data availability
    console.log('📊 Checking market data availability...');
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('symbol, current_price, last_update')
      .order('last_update', { ascending: false })
      .limit(10);

    if (marketError) {
      console.error('❌ Market data error:', marketError);
    } else {
      console.log(`📈 Found ${marketData?.length || 0} market data points:`);
      marketData?.forEach(data => {
        console.log(`  - ${data.symbol}: ${data.current_price} (${data.last_update})`);
      });
    }

    // Step 3: Check current signals
    console.log('🔍 Checking current active signals...');
    const { data: currentSignals, error: signalError } = await supabase
      .from('trading_signals')
      .select('symbol, type, price, confidence, created_at, status')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (signalError) {
      console.error('❌ Signal check error:', signalError);
    } else {
      console.log(`🎯 Found ${currentSignals?.length || 0} active centralized signals:`);
      currentSignals?.forEach(signal => {
        console.log(`  - ${signal.symbol} ${signal.type} @ ${signal.price} (${signal.confidence}% conf, ${signal.created_at})`);
      });
    }

    // Step 4: Test a single AI signal generation for EURUSD
    console.log('🧠 Testing AI signal generation for EURUSD...');
    const eurUsdData = marketData?.find(item => item.symbol === 'EURUSD');
    if (eurUsdData) {
      try {
        const currentPrice = parseFloat(eurUsdData.current_price.toString());
        console.log(`💰 EURUSD current price: ${currentPrice}`);

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
                
                Base your analysis on technical patterns, price action, and market momentum. Generate BUY or SELL signals for testing purposes. Avoid NEUTRAL.`
              },
              {
                role: 'user',
                content: `Analyze EURUSD trading data:
                Current Price: ${currentPrice}
                Market Timestamp: ${new Date().toISOString()}
                
                Generate a trading signal with specific entry, stop loss, and take profit levels. This is for testing purposes, so please provide a BUY or SELL signal (not NEUTRAL).`
              }
            ],
            max_tokens: 800,
            temperature: 0.3
          }),
        });

        if (!aiAnalysisResponse.ok) {
          console.error(`❌ OpenAI API error for EURUSD: ${aiAnalysisResponse.status} ${aiAnalysisResponse.statusText}`);
          const errorText = await aiAnalysisResponse.text();
          console.error('AI Error Details:', errorText);
        } else {
          const aiData = await aiAnalysisResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content;
          console.log('🤖 Raw AI Response:', aiContent);

          if (aiContent) {
            try {
              const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const aiSignal = JSON.parse(jsonMatch[0]);
                console.log('✅ Parsed AI Signal:', aiSignal);
                
                if (aiSignal.signal && ['BUY', 'SELL'].includes(aiSignal.signal)) {
                  console.log(`🎯 AI generated ${aiSignal.signal} signal with ${aiSignal.confidence}% confidence`);
                } else {
                  console.log(`⚠️ AI returned ${aiSignal.signal} signal - not actionable`);
                }
              } else {
                console.error('❌ No JSON found in AI response');
              }
            } catch (parseError) {
              console.error('❌ Failed to parse AI response:', parseError);
            }
          }
        }
      } catch (aiError) {
        console.error('❌ AI signal generation error:', aiError);
      }
    } else {
      console.log('❌ No EURUSD data available for AI testing');
    }

    // Step 5: Test generate-signals function
    console.log('🚀 Testing generate-signals function...');
    const { data: generateResult, error: generateError } = await supabase.functions.invoke('generate-signals', {
      body: { trigger: 'test' }
    });

    if (generateError) {
      console.error('❌ Generate signals error:', generateError);
    } else {
      console.log('✅ Generate signals response:', generateResult);
    }

    // Step 6: Check signals after generation
    console.log('🔄 Checking signals after generation...');
    const { data: newSignals, error: newSignalError } = await supabase
      .from('trading_signals')
      .select('symbol, type, price, confidence, created_at, status')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (newSignalError) {
      console.error('❌ New signal check error:', newSignalError);
    } else {
      console.log(`🎉 Found ${newSignals?.length || 0} active centralized signals after generation:`);
      newSignals?.forEach(signal => {
        console.log(`  - ${signal.symbol} ${signal.type} @ ${signal.price} (${signal.confidence}% conf, ${signal.created_at})`);
      });
    }

    // Step 7: Check cron jobs
    console.log('⏰ Checking cron job status...');
    try {
      const { data: cronJobs, error: cronError } = await supabase
        .rpc('sql', { 
          query: `SELECT jobname, schedule, command, active FROM cron.job WHERE jobname LIKE '%signal%' OR command LIKE '%generate-signals%';`
        });

      if (cronError) {
        console.error('❌ Cron job check error:', cronError);
      } else {
        console.log('📅 Active cron jobs:', cronJobs);
      }
    } catch (cronError) {
      console.error('❌ Cron job query error:', cronError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Comprehensive signal generation test completed',
        tests: {
          openAI: openAIApiKey ? 'configured' : 'missing',
          marketData: marketData?.length || 0,
          signalsBeforeGeneration: currentSignals?.length || 0,
          signalsAfterGeneration: newSignals?.length || 0,
          generateResult: generateResult
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Comprehensive test error:', error);
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
