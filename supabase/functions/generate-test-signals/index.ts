import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestSignalData {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  stop_loss: number;
  take_profits: number[];
  confidence: number;
  pips: number;
  analysis_text: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Generating test trading signals for immediate testing...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clear existing test signals to avoid constraint violations
    console.log('🧹 Clearing existing active signals...');
    const { error: deleteError } = await supabase
      .from('trading_signals')
      .delete()
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    if (deleteError) {
      console.error('⚠️ Warning: Could not clear existing signals:', deleteError);
    } else {
      console.log('✅ Cleared existing active signals');
    }

    // Get ALL available market data for comprehensive testing
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('symbol, current_price, bid, ask')
      .limit(10); // Test with up to 10 pairs instead of just 5

    if (marketError) {
      console.error('❌ Market data error:', marketError);
      throw new Error('Failed to fetch market data');
    }

    console.log(`📊 Using market data for ${marketData?.length || 0} currency pairs`);

    const testSignals: TestSignalData[] = [];

    // Generate realistic test signals based on current market prices
    marketData?.forEach((market, index) => {
      const isEven = index % 2 === 0;
      const signalType: 'BUY' | 'SELL' = isEven ? 'BUY' : 'SELL';
      const currentPrice = market.current_price;
      
      // Calculate realistic price levels based on the symbol
      let pipValue = 0.0001; // Default for major pairs
      if (market.symbol.includes('JPY')) {
        pipValue = 0.01; // JPY pairs have different pip values
      }
      
      const randomOffset = (Math.random() - 0.5) * 0.0020; // Small random offset
      const entryPrice = currentPrice + randomOffset;
      
      let stopLoss: number;
      let takeProfits: number[];
      let pips: number;
      
      if (signalType === 'BUY') {
        stopLoss = entryPrice - (30 * pipValue); // 30 pips stop loss
        takeProfits = [
          entryPrice + (20 * pipValue), // TP1: 20 pips
          entryPrice + (40 * pipValue), // TP2: 40 pips
          entryPrice + (60 * pipValue)  // TP3: 60 pips
        ];
        pips = 20; // Expected pips for first target
      } else {
        stopLoss = entryPrice + (30 * pipValue); // 30 pips stop loss
        takeProfits = [
          entryPrice - (20 * pipValue), // TP1: 20 pips
          entryPrice - (40 * pipValue), // TP2: 40 pips
          entryPrice - (60 * pipValue)  // TP3: 60 pips
        ];
        pips = 20; // Expected pips for first target
      }

      const confidence = 75 + Math.floor(Math.random() * 20); // 75-95% confidence

      const testSignal: TestSignalData = {
        symbol: market.symbol,
        type: signalType,
        price: parseFloat(entryPrice.toFixed(market.symbol.includes('JPY') ? 3 : 5)),
        stop_loss: parseFloat(stopLoss.toFixed(market.symbol.includes('JPY') ? 3 : 5)),
        take_profits: takeProfits.map(tp => parseFloat(tp.toFixed(market.symbol.includes('JPY') ? 3 : 5))),
        confidence,
        pips,
        analysis_text: `TEST SIGNAL: ${signalType} ${market.symbol} at ${entryPrice.toFixed(market.symbol.includes('JPY') ? 3 : 5)}. Technical analysis shows ${signalType === 'BUY' ? 'bullish momentum with support' : 'bearish pressure with resistance'} at current levels. This is a demo signal for testing purposes.`
      };

      testSignals.push(testSignal);
    });

    console.log(`🎯 Generated ${testSignals.length} test signals`);

    // Insert test signals into database
    const signalsToInsert = testSignals.map(signal => ({
      symbol: signal.symbol,
      type: signal.type,
      price: signal.price,
      stop_loss: signal.stop_loss,
      take_profits: signal.take_profits,
      confidence: signal.confidence,
      pips: signal.pips,
      status: 'active',
      is_centralized: true,
      user_id: null, // Centralized signals have no user_id
      analysis_text: signal.analysis_text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: insertedSignals, error: insertError } = await supabase
      .from('trading_signals')
      .insert(signalsToInsert)
      .select();

    if (insertError) {
      console.error('❌ Error inserting test signals:', insertError);
      throw new Error(`Failed to insert test signals: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedSignals?.length || 0} test signals`);

    // Dispatch background push notifications for each new test signal (for end-to-end testing)
    try {
      if (insertedSignals && insertedSignals.length > 0) {
        for (const s of insertedSignals) {
          const title = `🧪 New ${s.type} Test Signal`;
          const body = `${s.symbol} - Entry: ${s.price}`;
          await supabase.functions.invoke('send-push-notification', {
            body: {
              title,
              body,
              data: {
                symbol: String(s.symbol),
                type: 'new_signal',
                price: String(s.price),
                confidence: String(s.confidence ?? ''),
                test: 'true',
                timestamp: new Date().toISOString(),
              },
              notificationType: 'new_signal',
            },
          });
        }
      }
    } catch (notifyErr) {
      console.warn('⚠️ Test push notification dispatch failed (non-blocking):', notifyErr);
    }

    // Log the inserted signals
    insertedSignals?.forEach((signal, index) => {
      console.log(`🎯 Test Signal ${index + 1}: ${signal.symbol} ${signal.type} @ ${signal.price} (${signal.confidence}% confidence)`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${insertedSignals?.length || 0} test trading signals`,
        signals: insertedSignals,
        signalsGenerated: insertedSignals?.length || 0,
        testMode: true,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Test signal generation error:', error);
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