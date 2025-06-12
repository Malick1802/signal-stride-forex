
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Creating database function for cron cleanup...');

    // This function will be called by the cleanup-crons function
    const createCleanupFunction = `
      CREATE OR REPLACE FUNCTION unschedule_cron_job(job_name TEXT)
      RETURNS BOOLEAN AS $$
      BEGIN
        PERFORM cron.unschedule(job_name);
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Since we can't execute raw SQL directly, we'll return instructions
    console.log('✅ Database function ready for creation');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron cleanup function prepared',
        sqlFunction: createCleanupFunction,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error preparing cleanup function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
