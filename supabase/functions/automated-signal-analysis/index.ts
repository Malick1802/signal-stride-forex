
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { analyzeMarketWithAI } from './aiAnalyzer.ts';
import { generateSignalFromAnalysis } from './signalGenerator.ts';
import { fetchMarketData, fetchHistoricalData } from './marketDataFetcher.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Starting automated signal analysis...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get latest market data for analysis
    const marketData = await fetchMarketData(supabase);
    if (!marketData) {
      return new Response(
        JSON.stringify({ message: 'No market data available', signals: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Priority pairs for analysis
    const priorityPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'GBPJPY'];
    const signalsGenerated = [];

    for (const pair of priorityPairs) {
      try {
        const pairData = marketData.find(item => item.symbol === pair);
        if (!pairData) continue;

        // Get historical data for the pair
        const historicalData = await fetchHistoricalData(supabase, pair);
        if (!historicalData?.length) continue;

        // Analyze with OpenAI
        const analysisResult = await analyzeMarketWithAI(pair, pairData, historicalData, openAIApiKey);
        
        if (analysisResult.shouldTrade && analysisResult.confidence >= 90) {
          console.log(`✨ High confidence signal found for ${pair}: ${analysisResult.confidence}%`);
          
          // Generate signal
          const signal = await generateSignalFromAnalysis(pair, pairData, analysisResult, supabase);
          if (signal) {
            signalsGenerated.push(signal);
          }
        }
      } catch (error) {
        console.error(`❌ Error analyzing ${pair}:`, error);
      }
    }

    console.log(`✅ Automated analysis complete. Generated ${signalsGenerated.length} high-confidence signals`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signalsGenerated.length} automated signals`,
        signals: signalsGenerated,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in automated signal analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
