
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
    console.log('🧪 Testing signal generation system...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Check market data availability
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

    // Step 2: Check current signals
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

    // Step 3: Test generate-signals function
    console.log('🚀 Testing generate-signals function...');
    const { data: generateResult, error: generateError } = await supabase.functions.invoke('generate-signals', {
      body: { trigger: 'test' }
    });

    if (generateError) {
      console.error('❌ Generate signals error:', generateError);
      throw generateError;
    }

    console.log('✅ Generate signals response:', generateResult);

    // Step 4: Check signals after generation
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signal generation test completed',
        marketDataCount: marketData?.length || 0,
        signalsBeforeGeneration: currentSignals?.length || 0,
        signalsAfterGeneration: newSignals?.length || 0,
        generateResult: generateResult,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Test error:', error);
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
