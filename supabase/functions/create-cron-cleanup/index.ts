
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

    console.log('🔧 Creating selective database functions for time-expiration cleanup...');

    // Create function for selective cron job removal (only time-based expiration)
    const createSelectiveCleanupFunction = `
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

      CREATE OR REPLACE FUNCTION list_time_expiration_jobs()
      RETURNS TABLE(job_name TEXT, job_schedule TEXT) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          cj.jobname::TEXT,
          cj.schedule::TEXT
        FROM cron.job cj
        WHERE cj.jobname SIMILAR TO '%(expire|expiration|timeout|cleanup)%'
        AND cj.jobname NOT SIMILAR TO '%(generate|fetch|stream|tick)%';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE OR REPLACE FUNCTION preserve_essential_jobs()
      RETURNS TABLE(job_name TEXT, job_status TEXT) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          cj.jobname::TEXT,
          'PRESERVED'::TEXT
        FROM cron.job cj
        WHERE cj.jobname IN (
          'auto-generate-signals',
          'fetch-market-data',
          'fastforex-market-stream',
          'fastforex-tick-generator',
          'fastforex-signal-generation',
          'invoke-generate-signals-every-5min'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    console.log('✅ Selective database functions ready for creation');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Selective cron cleanup functions prepared',
        approach: 'SELECTIVE - Remove only time-based expiration, preserve essential services',
        sqlFunctions: createSelectiveCleanupFunction,
        targeting: {
          remove: ['expire-old-signals', 'signal-expiration-*', 'timeout-*', 'cleanup-*'],
          preserve: ['auto-generate-signals', 'fetch-market-data', 'fastforex-*']
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error preparing selective cleanup functions:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
