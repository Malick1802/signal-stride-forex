
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
    console.log('🧹 Starting cron cleanup for outcome-based system...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clear all existing cron jobs
    console.log('❌ Removing all existing cron jobs...');
    const { error: deleteError } = await supabase.rpc('cron.unschedule', { job_name: 'invoke-generate-signals-every-5min' });
    const { error: deleteError2 } = await supabase.rpc('cron.unschedule', { job_name: 'generate-signals-every-5min' });
    const { error: deleteError3 } = await supabase.rpc('cron.unschedule', { job_name: 'auto-signal-generation' });
    const { error: deleteError4 } = await supabase.rpc('cron.unschedule', { job_name: 'centralized-signal-generation' });
    const { error: deleteError5 } = await supabase.rpc('cron.unschedule', { job_name: 'ai-signal-generation-5min' });

    console.log('✅ Existing cron jobs cleared');

    // Create signal generation cron (every 5 minutes)
    console.log('📅 Creating signal generation cron job...');
    
    const signalGenQuery = `
      SELECT cron.schedule(
        'outcome-based-signal-generation',
        '*/5 * * * *',
        $$
        SELECT net.http_post(
          url := 'https://ugtaodrvbpfeyhdgmisn.supabase.co/functions/v1/generate-signals',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDA2MDYxNSwiZXhwIjoyMDQ5NjM2NjE1fQ.rXFRPOHZqGdO44dn2Z7jUVKfJXkSkNXU5CjmOL0-YIM"}'::jsonb,
          body := '{"trigger": "cron"}'::jsonb
        );
        $$
      );
    `;

    const { error: cronError } = await supabase.rpc('sql', { query: signalGenQuery });

    if (cronError) {
      console.error('❌ Error creating signal generation cron:', cronError);
      throw cronError;
    }

    // Create cleanup cron (daily at 2 AM UTC) - only for very old data
    console.log('📅 Creating daily cleanup cron job...');
    
    const cleanupQuery = `
      SELECT cron.schedule(
        'outcome-based-cleanup',
        '0 2 * * *',
        $$
        SELECT public.cleanup_old_signals();
        $$
      );
    `;

    const { error: cleanupError } = await supabase.rpc('sql', { query: cleanupQuery });

    if (cleanupError) {
      console.error('❌ Error creating cleanup cron:', cleanupError);
      throw cleanupError;
    }

    console.log('✅ Outcome-based cron jobs created successfully');
    console.log('🎯 Signal generation: every 5 minutes');
    console.log('🧹 Cleanup: daily at 2 AM UTC (30+ day old expired signals only)');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Outcome-based cron system setup completed',
        cronJobs: [
          'outcome-based-signal-generation (every 5 minutes)',
          'outcome-based-cleanup (daily at 2 AM UTC)'
        ],
        note: 'Signals now expire only based on trading outcomes (stop loss/take profit hits)',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Cron cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
