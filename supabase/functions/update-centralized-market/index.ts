
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
    console.log('⚡ Triggering centralized market stream update...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Call the centralized market stream function
    const { data, error } = await supabase.functions.invoke('centralized-market-stream');
    
    if (error) {
      console.error('❌ Failed to trigger market stream:', error);
      throw error;
    }
    
    console.log('✅ Centralized market stream triggered successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Centralized market stream update triggered',
        result: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error triggering market update:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
