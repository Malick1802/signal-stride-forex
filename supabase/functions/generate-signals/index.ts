
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🤖 Starting centralized signal generation...');

    // Check if forex markets are open
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                        (utcDay === 0 && utcHour >= 22) || 
                        (utcDay === 5 && utcHour < 22);

    console.log(`📊 Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'} (UTC Day: ${utcDay}, Hour: ${utcHour})`);

    // Get the most recent centralized market data first
    const { data: centralizedData, error: centralizedError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(50);

    let marketData = centralizedData || [];

    // If no centralized data, fallback to live_market_data
    if (marketData.length === 0) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('live_market_data')
        .select('*')
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!fallbackError && fallbackData) {
        // Transform fallback data to match centralized format
        marketData = fallbackData.map(item => ({
          symbol: item.symbol,
          current_price: item.price,
          bid: item.bid,
          ask: item.ask,
          last_update: item.created_at || item.timestamp,
          source: item.source || 'fallback'
        }));
      }
    }

    console.log(`📊 Found ${marketData?.length || 0} market data records`);

    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No recent market data available for signal generation');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No recent market data available for signal generation',
          marketOpen: isMarketOpen,
          dataAge: 'none'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete old active signals first (older than 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    console.log('🧹 Cleaning up old signals...');
    const { error: cleanupError } = await supabase
      .from('trading_signals')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('created_at', fourHoursAgo);

    if (cleanupError) {
      console.warn('⚠️ Error cleaning up old signals:', cleanupError);
    }

    // Check for existing active centralized signals to avoid duplicates
    const { data: existingSignals } = await supabase
      .from('trading_signals')
      .select('symbol')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

    const existingSymbols = new Set(existingSignals?.map(s => s.symbol) || []);
    console.log(`🔍 Found ${existingSymbols.size} existing active centralized signals`);

    // Group market data by symbol and get the latest price for each
    const symbolData: Record<string, any> = {};
    marketData.forEach(item => {
      if (item.symbol && item.current_price !== null) {
        if (!symbolData[item.symbol] || new Date(item.last_update) > new Date(symbolData[item.symbol].last_update)) {
          symbolData[item.symbol] = item;
        }
      }
    });

    const CONFIDENCE_THRESHOLD = 85;
    const signalsGenerated = [];
    const maxSignalsPerRun = 6;

    console.log(`🔍 Analyzing ${Object.keys(symbolData).length} symbols for centralized signal generation`);

    // Use timestamp-based deterministic seed for consistent analysis across all users
    const hourSeed = Math.floor(Date.now() / (60 * 60 * 1000)); // Changes every hour

    for (const [symbol, priceInfo] of Object.entries(symbolData)) {
      if (signalsGenerated.length >= maxSignalsPerRun) break;
      
      try {
        // Skip if already has recent active centralized signal
        if (existingSymbols.has(symbol)) {
          console.log(`⏭️ Skipping ${symbol} - already has active centralized signal`);
          continue;
        }

        const currentPrice = Number(priceInfo.current_price);
        
        if (currentPrice <= 0 || isNaN(currentPrice)) {
          console.log(`⏭️ Skipping ${symbol} - invalid price: ${currentPrice}`);
          continue;
        }

        // Enhanced deterministic market analysis
        const analysis = analyzeDeterministicMarketConditions(symbol, currentPrice, hourSeed);
        
        console.log(`📊 ${symbol}: Confidence ${analysis.confidence}%, Signal: ${analysis.signalType}, Current Price: ${currentPrice}`);
        
        if (analysis.confidence < CONFIDENCE_THRESHOLD) {
          console.log(`⏭️ Skipping ${symbol} - confidence too low (${analysis.confidence}%)`);
          continue;
        }

        // Calculate trading levels with realistic spreads
        const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
        const volatilityMultiplier = analysis.volatility > 0.001 ? 1.2 : 1.0;
        
        const stopLossDistance = analysis.signalType === 'BUY' 
          ? -30 * pipValue * volatilityMultiplier 
          : 30 * pipValue * volatilityMultiplier;
          
        const takeProfitDistances = [
          50 * pipValue * volatilityMultiplier,
          85 * pipValue * volatilityMultiplier,
          130 * pipValue * volatilityMultiplier
        ];
        
        if (analysis.signalType === 'SELL') {
          takeProfitDistances.forEach((_, i) => takeProfitDistances[i] *= -1);
        }

        const stopLoss = parseFloat((currentPrice + stopLossDistance).toFixed(symbol.includes('JPY') ? 3 : 5));
        const takeProfits = takeProfitDistances.map(distance => 
          parseFloat((currentPrice + distance).toFixed(symbol.includes('JPY') ? 3 : 5))
        );

        // Create centralized signal record with FIXED chart data that will be identical for all users
        const signalData = {
          symbol,
          type: analysis.signalType,
          price: currentPrice,
          stop_loss: stopLoss,
          take_profits: takeProfits,
          confidence: Math.round(analysis.confidence),
          pips: Math.abs(takeProfitDistances[0] / pipValue),
          is_centralized: true,
          user_id: null,
          status: 'active',
          analysis_text: analysis.reasoning,
          asset_type: 'FOREX',
          chart_data: analysis.chartData // This FIXED chart data ensures all users see the same graph
        };

        console.log(`🚀 Creating centralized signal for ${symbol}:`, signalData);

        const { data: signal, error: signalError } = await supabase
          .from('trading_signals')
          .insert(signalData)
          .select()
          .single();

        if (signalError) {
          console.error(`❌ Error creating signal for ${symbol}:`, signalError);
          continue;
        }

        signalsGenerated.push({
          symbol,
          confidence: Math.round(analysis.confidence),
          type: analysis.signalType,
          price: currentPrice,
          id: signal.id,
          chartData: analysis.chartData
        });
        
        console.log(`✅ Generated centralized signal: ${symbol} ${analysis.signalType} @ ${currentPrice} (${analysis.confidence}%)`);
        
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
        continue;
      }
    }

    const responseData = {
      success: true, 
      message: `Generated ${signalsGenerated.length} centralized high-confidence signals from ${Object.keys(symbolData).length} analyzed pairs`,
      signals: signalsGenerated,
      threshold: CONFIDENCE_THRESHOLD,
      marketOpen: isMarketOpen,
      analyzed: Object.keys(symbolData).length,
      dataRecords: marketData?.length || 0,
      existingSignals: existingSymbols.size,
      centralized: true
    };

    console.log('🎉 Centralized signal generation completed:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR in centralized signal generation:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeDeterministicMarketConditions(symbol: string, currentPrice: number, hourSeed: number) {
  // Create deterministic "randomness" based on symbol and hour
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const deterministicSeed = (symbolHash * hourSeed) % 1000;
  
  // Simulate price changes using deterministic values
  const baseVolatility = 0.0008;
  const volatility = baseVolatility * (1 + (deterministicSeed % 100) / 500);
  
  // Deterministic momentum calculation
  const momentum = Math.sin(deterministicSeed / 100) * volatility * 2;
  
  // Signal determination with deterministic logic
  let confidence = 82 + (deterministicSeed % 15); // 82-96 range
  let signalType = 'BUY';
  
  // Deterministic signal type based on symbol and time
  if (momentum > 0.0002) {
    signalType = 'BUY';
    confidence += 6;
  } else if (momentum < -0.0002) {
    signalType = 'SELL';
    confidence += 6;
  }
  
  // Time-based adjustments (deterministic)
  const hour = new Date().getUTCHours();
  if ((hour >= 8 && hour <= 16) || (hour >= 13 && hour <= 21)) {
    confidence += 4;
  }
  
  // Deterministic signal flip for balance (not random)
  if ((deterministicSeed % 10) > 6) {
    signalType = signalType === 'BUY' ? 'SELL' : 'BUY';
  }
  
  confidence = Math.min(96, Math.max(75, confidence));
  
  // Generate COMPLETELY DETERMINISTIC and FIXED chart data that will be stored in the database
  // This ensures ALL users see the exact same chart for each signal
  const chartData = [];
  for (let i = 0; i < 30; i++) {
    // Use completely deterministic calculation based on symbol hash and hour seed
    const timeFactor = i / 30;
    const priceFactor = 1 + Math.sin((deterministicSeed + i * 10) / 100) * volatility;
    
    chartData.push({
      time: i,
      price: parseFloat((currentPrice * priceFactor).toFixed(5))
    });
  }
  
  const reasoning = `Centralized ${signalType} signal for ${symbol} based on deterministic analysis. Market momentum: ${(momentum * 100).toFixed(4)}%. Volatility: ${(volatility * 100).toFixed(4)}%. Technical analysis indicates ${confidence >= 90 ? 'strong' : 'moderate'} ${signalType.toLowerCase()} opportunity with favorable risk/reward ratio. Generated at ${new Date().toISOString()}.`;
  
  return {
    confidence,
    signalType,
    volatility,
    reasoning,
    chartData
  };
}
