import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Test function invoked');

    const fastforexKey = Deno.env.get('FASTFOREX_API_KEY');
    const alphaVantageKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');

    console.log('🔑 API Keys check:', {
      fastforex: fastforexKey ? '✅ Present' : '❌ Missing',
      alphaVantage: alphaVantageKey ? '✅ Present' : '❌ Missing'
    });

    // Test FastForex with a simple fetch
    let fastforexTest = null;
    if (fastforexKey) {
      try {
        const url = `https://api.fastforex.io/fetch-one?from=USD&to=EUR&api_key=${fastforexKey}`;
        console.log('📡 Testing FastForex API...');
        const response = await fetch(url);
        const data = await response.json();
        fastforexTest = {
          status: response.status,
          success: response.ok,
          data: data
        };
        console.log('✅ FastForex response:', fastforexTest);
      } catch (error) {
        fastforexTest = { error: error.message };
        console.error('❌ FastForex error:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function working',
        timestamp: new Date().toISOString(),
        apiKeys: {
          fastforex: !!fastforexKey,
          alphaVantage: !!alphaVantageKey
        },
        fastforexTest
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Test function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
