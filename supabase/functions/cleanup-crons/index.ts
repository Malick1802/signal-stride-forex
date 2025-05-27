

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
    console.log('🧹 Starting comprehensive cron cleanup and setup...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, check if pg_cron extension is available
    console.log('🔍 Checking pg_cron extension availability...');
    const { data: extensionData, error: extensionError } = await supabase
      .rpc('sql', { 
        query: "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') as has_pg_cron;" 
      });

    if (extensionError) {
      console.error('❌ Could not check pg_cron extension:', extensionError);
      throw new Error('Database extension check failed');
    }

    if (!extensionData || !extensionData[0]?.has_pg_cron) {
      console.log('⚠️ pg_cron extension not available, using alternative approach...');
      
      // Alternative: Set up a simple database trigger or use edge function scheduling
      // For now, return success but indicate manual triggering is needed
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Manual signal generation mode activated (pg_cron not available)',
          note: 'Use the manual generation buttons to create signals',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clear existing cron jobs
    console.log('❌ Removing all existing signal-related cron jobs...');
    
    const existingJobs = [
      'invoke-generate-signals-every-5min',
      'generate-signals-every-5min', 
      'auto-signal-generation',
      'centralized-signal-generation',
      'ai-signal-generation-5min',
      'automatic-signal-generation'
    ];

    for (const jobName of existingJobs) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `SELECT cron.unschedule('${jobName}');` 
        });
        if (error && !error.message.includes('does not exist')) {
          console.log(`⚠️ Could not remove job ${jobName}:`, error.message);
        } else {
          console.log(`✅ Cleaned up job: ${jobName}`);
        }
      } catch (error) {
        console.log(`⚠️ Error cleaning ${jobName}:`, error.message);
      }
    }

    // Check if pg_net extension is available for HTTP calls
    const { data: netExtensionData, error: netExtensionError } = await supabase
      .rpc('sql', { 
        query: "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') as has_pg_net;" 
      });

    if (netExtensionError || !netExtensionData || !netExtensionData[0]?.has_pg_net) {
      console.log('⚠️ pg_net extension not available, cannot create HTTP-based cron jobs');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Cron setup completed but HTTP calls not available',
          note: 'pg_net extension required for automatic HTTP-based signal generation',
          recommendation: 'Use manual generation buttons or contact support to enable pg_net',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the cron job with HTTP call
    console.log('📅 Creating new automatic signal generation cron job...');
    
    const cronJobSql = `
      SELECT cron.schedule(
        'automatic-signal-generation',
        '*/5 * * * *',
        $$
        SELECT net.http_post(
          url := '${supabaseUrl}/functions/v1/generate-signals',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
          ),
          body := jsonb_build_object(
            'trigger', 'cron',
            'automatic', true
          )
        );
        $$
      );
    `;

    const { error: cronError } = await supabase.rpc('sql', { query: cronJobSql });

    if (cronError) {
      console.error('❌ Error creating automatic cron job:', cronError);
      throw cronError;
    }

    console.log('✅ Created automatic signal generation cron job: "automatic-signal-generation"');
    console.log('🔄 Signals will be generated automatically every 5 minutes');
    console.log('⚡ Using service role key for proper authorization');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Automatic signal generation cron job configured successfully',
        cronJob: 'automatic-signal-generation (every 5 minutes)',
        authorization: 'service_role_key',
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
        suggestion: 'Check if pg_cron and pg_net extensions are enabled in your Supabase project'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

