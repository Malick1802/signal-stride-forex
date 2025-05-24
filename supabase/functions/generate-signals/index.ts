
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

    console.log('Fetching recent market data...');

    // Fetch recent market data with better query
    const { data: marketData, error: fetchError } = await supabase
      .from('live_market_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    console.log('Market data query result:', { count: marketData?.length || 0, error: fetchError });

    if (fetchError) {
      console.error('Database query error:', fetchError);
      throw new Error(`Failed to fetch market data: ${fetchError.message}`);
    }

    if (!marketData || marketData.length === 0) {
      console.log('No market data found in database');
      return new Response(
        JSON.stringify({ error: 'No market data available. Please wait for data to be collected.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing market data for', marketData.length, 'records');

    // Group data by symbol and get the most recent data for each
    const symbolData = marketData.reduce((acc, item) => {
      if (!acc[item.symbol]) acc[item.symbol] = [];
      acc[item.symbol].push(item);
      return acc;
    }, {});

    console.log('Found symbols:', Object.keys(symbolData));

    // Generate signals for each symbol
    const signalsGenerated = [];
    
    for (const [symbol, prices] of Object.entries(symbolData)) {
      try {
        console.log(`Processing ${symbol} with ${(prices as any[]).length} data points`);
        
        if ((prices as any[]).length < 2) {
          console.log(`Skipping ${symbol} - insufficient data`);
          continue;
        }

        // Sort by timestamp to get proper order
        const sortedPrices = (prices as any[]).sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const currentPrice = parseFloat(sortedPrices[0].price.toString());
        const previousPrice = sortedPrices.length > 1 ? parseFloat(sortedPrices[1].price.toString()) : currentPrice;
        
        console.log(`${symbol}: current=${currentPrice}, previous=${previousPrice}`);
        
        // Simple trend analysis
        const priceChange = currentPrice - previousPrice;
        const trend = priceChange > 0 ? 'bullish' : 'bearish';
        const signalType = trend === 'bullish' ? 'BUY' : 'SELL';
        
        // Calculate confidence based on price movement
        const priceChangePercent = Math.abs(priceChange / previousPrice) * 100;
        const baseConfidence = 75;
        const volatilityBonus = Math.min(15, priceChangePercent * 1000); // Boost for larger moves
        const confidence = Math.min(95, Math.max(70, baseConfidence + volatilityBonus));
        
        console.log(`${symbol}: trend=${trend}, confidence=${confidence}`);

        // Use OpenAI for analysis if available
        let analysis = `Technical analysis based on recent price movement. ${trend} trend detected with ${priceChangePercent.toFixed(4)}% change.`;
        
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
                    content: 'You are a professional forex analyst. Provide concise technical analysis based on price data.'
                  },
                  {
                    role: 'user',
                    content: `Analyze ${symbol} forex pair: Current price ${currentPrice}, Previous price ${previousPrice}, Change: ${priceChangePercent.toFixed(4)}%. The trend appears ${trend}. Provide brief analysis for a ${signalType} signal in 1-2 sentences.`
                  }
                ],
                max_tokens: 150,
                temperature: 0.3
              }),
            });

            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              analysis = analysisData.choices?.[0]?.message?.content || analysis;
            }
          } catch (aiError) {
            console.error(`AI analysis failed for ${symbol}:`, aiError);
          }
        }
        
        // Calculate stop loss and take profit levels
        const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
        const stopLossDistance = signalType === 'BUY' ? -30 * pipValue : 30 * pipValue;
        const takeProfitDistance = signalType === 'BUY' ? 50 * pipValue : -50 * pipValue;
        
        const stopLoss = currentPrice + stopLossDistance;
        const takeProfit1 = currentPrice + takeProfitDistance;
        const takeProfit2 = currentPrice + (takeProfitDistance * 1.5);
        const takeProfit3 = currentPrice + (takeProfitDistance * 2);

        console.log(`${symbol}: Creating signal - ${signalType} at ${currentPrice}`);

        // Insert the signal
        const { data: signal, error: signalError } = await supabase
          .from('trading_signals')
          .insert({
            symbol,
            type: signalType,
            price: currentPrice,
            stop_loss: stopLoss,
            take_profits: [takeProfit1, takeProfit2, takeProfit3],
            confidence: Math.round(confidence),
            pips: Math.abs(takeProfitDistance / pipValue),
            is_centralized: true,
            user_id: null,
            status: 'active',
            analysis_text: analysis,
            asset_type: 'FOREX'
          })
          .select()
          .single();

        if (signalError) {
          console.error(`Error inserting signal for ${symbol}:`, signalError);
          continue;
        }

        // Insert AI analysis if signal was created successfully
        if (signal) {
          const { error: analysisError } = await supabase
            .from('ai_analysis')
            .insert({
              signal_id: signal.id,
              analysis_text: analysis,
              confidence_score: confidence,
              market_conditions: {
                trend,
                currentPrice,
                previousPrice,
                priceChange,
                symbol
              }
            });

          if (analysisError) {
            console.error(`Error inserting AI analysis for ${symbol}:`, analysisError);
          }
        }

        signalsGenerated.push(symbol);
        console.log(`Successfully generated signal for ${symbol}`);
        
      } catch (symbolError) {
        console.error(`Error processing ${symbol}:`, symbolError);
        continue;
      }
    }

    console.log(`Generated ${signalsGenerated.length} signals for symbols:`, signalsGenerated);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${signalsGenerated.length} signals successfully`,
        symbols: signalsGenerated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-signals function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
