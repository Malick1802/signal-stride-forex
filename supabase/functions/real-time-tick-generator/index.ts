import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced market session characteristics
const getMarketSession = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 22 || utcHour < 8) {
    return { 
      name: 'Asian', 
      volatility: 0.4, 
      trend: 0.15,
      spreadMultiplier: 1.2
    };
  } else if (utcHour >= 8 && utcHour < 16) {
    return { 
      name: 'European', 
      volatility: 0.8, 
      trend: 0.3, 
      spreadMultiplier: 1.0 
    };
  } else if (utcHour >= 13 && utcHour < 17) {
    return { 
      name: 'US-EU-Overlap', 
      volatility: 1.2, 
      trend: 0.4, 
      spreadMultiplier: 0.8
    };
  } else {
    return { 
      name: 'US', 
      volatility: 1.0, 
      trend: 0.35, 
      spreadMultiplier: 0.9 
    };
  }
};

const isMarketOpen = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  
  const isFridayEvening = utcDay === 5 && utcHour >= 22;
  const isSaturday = utcDay === 6;
  const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
  
  return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
};

// Enhanced market event simulation
const getMarketEventMultiplier = () => {
  if (Math.random() < 0.02) { // 2% chance of market event
    return 2.5 + Math.random() * 2.0; // 2.5x to 4.5x volatility spike
  }
  return 1;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚫 Artificial tick generation DISABLED - Using direct FastForex data only...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Artificial tick generation is now DISABLED
    // All price updates come directly from FastForex via centralized-market-stream
    
    console.log('✅ Artificial tick generation disabled - FastForex direct integration active');
    
    return new Response(
      JSON.stringify({ 
        message: 'Artificial tick generation disabled - using direct FastForex data only',
        isMarketOpen: isMarketOpen(),
        timestamp: new Date().toISOString(),
        recommendation: 'Use centralized-market-stream for real FastForex data',
        updateFrequency: '15s direct FastForex updates'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 FastForex tick generator disabled:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Artificial tick generation disabled',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
