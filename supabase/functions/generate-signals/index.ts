
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting automated signal generation...');

    // Check if forex markets are open
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                        (utcDay === 0 && utcHour >= 22) || 
                        (utcDay === 5 && utcHour < 22);

    if (!isMarketOpen) {
      console.log('Markets closed, skipping signal generation');
      return new Response(
        JSON.stringify({ 
          message: 'Markets closed - no signals generated',
          marketOpen: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recent market data (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('*')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });

    if (marketError || !marketData || marketData.length === 0) {
      console.error('No recent market data available:', marketError);
      return new Response(
        JSON.stringify({ 
          error: 'No recent market data available',
          suggestion: 'Run fetch-market-data function first'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing active signals to prevent duplicates
    const { data: existingSignals } = await supabase
      .from('trading_signals')
      .select('symbol')
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());

    const existingSymbols = new Set(existingSignals?.map(s => s.symbol) || []);
    console.log('Existing active signals:', Array.from(existingSymbols));

    // Group market data by symbol and get most recent for each
    const symbolData: Record<string, any[]> = {};
    marketData.forEach(item => {
      if (item.symbol && item.price !== null) {
        if (!symbolData[item.symbol]) symbolData[item.symbol] = [];
        symbolData[item.symbol].push(item);
      }
    });

    // Filter available symbols (exclude those with active signals)
    const availableSymbols = Object.keys(symbolData)
      .filter(symbol => !existingSymbols.has(symbol))
      .slice(0, 5); // Limit to 5 new signals per run

    if (availableSymbols.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No new signals needed - all major pairs have recent signals',
          existingSignals: Array.from(existingSymbols)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signalsGenerated = [];

    for (const symbol of availableSymbols) {
      try {
        const prices = symbolData[symbol].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const latestData = prices[0];
        const currentPrice = Number(latestData.price);
        
        if (currentPrice <= 0 || isNaN(currentPrice)) {
          console.log(`Skipping ${symbol} - invalid price: ${currentPrice}`);
          continue;
        }

        // Advanced signal generation logic
        let signalType = 'BUY';
        let confidence = 75;
        let analysis = '';

        // Technical analysis based on recent price movement
        if (prices.length > 1) {
          const priceChanges = [];
          for (let i = 1; i < Math.min(prices.length, 5); i++) {
            const change = (currentPrice - Number(prices[i].price)) / Number(prices[i].price);
            priceChanges.push(change);
          }
          
          const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
          const volatility = Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length);
          
          // Determine signal based on momentum and volatility
          if (Math.abs(avgChange) > 0.001) { // Significant momentum
            signalType = avgChange > 0 ? 'BUY' : 'SELL';
            confidence = Math.min(95, 80 + Math.abs(avgChange) * 10000);
          } else {
            // Contrarian approach for low momentum
            signalType = Math.random() > 0.5 ? 'BUY' : 'SELL';
            confidence = 70 + Math.random() * 15;
          }
          
          // Adjust confidence based on volatility
          confidence = Math.max(70, confidence - (volatility * 1000));
        }

        // Only generate high-confidence signals (85%+)
        if (confidence < 85) {
          console.log(`Skipping ${symbol} - confidence too low: ${confidence}%`);
          continue;
        }

        // Generate comprehensive AI analysis
        if (openAIApiKey) {
          try {
            const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    content: 'You are a professional forex analyst. Provide comprehensive technical analysis with specific entry, stop loss, and take profit levels. Include market sentiment, risk factors, and trading strategy.'
                  },
                  {
                    role: 'user',
                    content: `Analyze ${symbol} at current price ${currentPrice}. Signal: ${signalType} with ${confidence}% confidence. Provide detailed analysis including:
                    1. Technical analysis and market conditions
                    2. Entry strategy and timing
                    3. Risk management approach
                    4. Market sentiment factors
                    5. Key levels to watch
                    Limit to 200 words.`
                  }
                ],
                max_tokens: 200,
                temperature: 0.3
              }),
            });

            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              analysis = analysisData.choices?.[0]?.message?.content || 
                `Professional ${signalType} signal for ${symbol} at ${currentPrice}. High-probability setup based on momentum analysis and market structure. Recommended for experienced traders with proper risk management.`;
            }
          } catch (aiError) {
            console.error(`AI analysis failed for ${symbol}:`, aiError);
            analysis = `Technical ${signalType} signal for ${symbol} at ${currentPrice}. Strong momentum detected with ${confidence}% confidence based on recent price action and market conditions.`;
          }
        } else {
          analysis = `Automated ${signalType} signal for ${symbol} at ${currentPrice}. High-confidence setup based on technical analysis and momentum indicators.`;
        }

        // Calculate precise stop loss and take profit levels
        const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
        const stopLossDistance = signalType === 'BUY' ? -25 * pipValue : 25 * pipValue;
        const takeProfitDistances = [40 * pipValue, 60 * pipValue, 80 * pipValue];
        
        if (signalType === 'SELL') {
          takeProfitDistances.forEach((_, i) => takeProfitDistances[i] *= -1);
        }

        const stopLoss = parseFloat((currentPrice + stopLossDistance).toFixed(symbol.includes('JPY') ? 3 : 5));
        const takeProfits = takeProfitDistances.map(distance => 
          parseFloat((currentPrice + distance).toFixed(symbol.includes('JPY') ? 3 : 5))
        );

        // Insert signal with comprehensive data
        const signalData = {
          symbol,
          type: signalType,
          price: currentPrice,
          stop_loss: stopLoss,
          take_profits: takeProfits,
          confidence: Math.round(confidence),
          pips: Math.abs(takeProfitDistances[0] / pipValue),
          is_centralized: true,
          user_id: null,
          status: 'active',
          analysis_text: analysis,
          asset_type: 'FOREX'
        };

        const { data: signal, error: signalError } = await supabase
          .from('trading_signals')
          .insert(signalData)
          .select()
          .single();

        if (signalError) {
          console.error(`Error inserting signal for ${symbol}:`, signalError);
          continue;
        }

        // Insert comprehensive AI analysis record
        if (signal) {
          await supabase
            .from('ai_analysis')
            .insert({
              signal_id: signal.id,
              analysis_text: analysis,
              confidence_score: confidence,
              market_conditions: {
                symbol,
                currentPrice,
                signalType,
                marketOpen: isMarketOpen,
                timestamp: now.toISOString()
              }
            });
        }

        signalsGenerated.push(symbol);
        console.log(`Generated high-confidence signal for ${symbol} (${confidence}%)`);
        
      } catch (symbolError) {
        console.error(`Error processing ${symbol}:`, symbolError);
        continue;
      }
    }

    console.log(`Automated signal generation complete: ${signalsGenerated.length} signals`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${signalsGenerated.length} high-confidence signals`,
        signals: signalsGenerated,
        marketOpen: isMarketOpen,
        automated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-signals function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
