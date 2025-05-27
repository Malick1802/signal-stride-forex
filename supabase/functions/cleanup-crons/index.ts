
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

    // Clear ALL existing cron jobs to prevent conflicts
    console.log('❌ Removing all existing signal-related cron jobs...');
    
    // Remove all possible signal generation cron jobs
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
        const { error } = await supabase.rpc('cron.unschedule', { job_name: jobName });
        if (error) {
          console.log(`⚠️ Job ${jobName} might not exist:`, error.message);
        } else {
          console.log(`✅ Removed job: ${jobName}`);
        }
      } catch (error) {
        console.log(`⚠️ Error removing ${jobName}:`, error.message);
      }
    }

    // Create the definitive cron job for automatic signal generation
    console.log('📅 Creating new automatic signal generation cron job...');
    
    const { error: cronError } = await supabase
      .from('cron.job')
      .insert({
        jobname: 'automatic-signal-generation',
        schedule: '*/5 * * * *',
        command: `SELECT net.http_post(
          url := '${supabaseUrl}/functions/v1/generate-signals',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
          ),
          body := jsonb_build_object(
            'trigger', 'cron',
            'automatic', true
          )
        );`
      });

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
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
