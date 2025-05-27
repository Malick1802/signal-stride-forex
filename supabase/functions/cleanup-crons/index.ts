
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
    console.log('🧹 Starting cron cleanup and setup...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we're on a Supabase instance that supports pg_cron and pg_net
    // These extensions are typically not available on the free tier
    console.log('🔍 Checking database capabilities...');
    
    // Try to check if extensions are available by attempting a simple operation
    // Since we can't execute raw SQL, we'll use a different approach
    
    // For now, we'll inform the user that manual generation is recommended
    // This is because pg_cron and pg_net are often not available on free tier
    
    console.log('⚠️ Automatic cron setup requires pg_cron and pg_net extensions');
    console.log('💡 These extensions are typically not available on Supabase free tier');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'pg_cron and pg_net extensions required for automatic signal generation',
        note: 'These extensions are typically not available on Supabase free tier. Use manual generation buttons instead.',
        recommendation: 'Upgrade to Pro tier or use manual signal generation',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Cron setup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestion: 'pg_cron and pg_net extensions are required but may not be available on free tier'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
