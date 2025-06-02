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
    console.log('🧹 Starting comprehensive cron cleanup to fix GitHub Actions scheduling conflicts...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Remove ALL competing signal generation cron jobs to eliminate conflicts with GitHub Actions
    console.log('❌ Removing all competing signal generation cron jobs...');
    const competingJobs = [
      'invoke-generate-signals-every-5min',
      'generate-signals-every-5min',
      'auto-signal-generation',
      'centralized-signal-generation',
      'ai-signal-generation-5min',
      'outcome-based-signal-generation', // This was conflicting with GitHub Actions
      'signal-generation-cron-1',
      'signal-generation-cron-9',
      'signal-generation-cron-15'
    ];

    for (const jobName of competingJobs) {
      try {
        const { error } = await supabase.rpc('cron.unschedule', { job_name: jobName });
        if (!error) {
          console.log(`✅ Removed competing cron job: ${jobName}`);
        }
      } catch (error) {
        console.log(`⚠️ Job ${jobName} not found or already removed`);
      }
    }

    // Keep only essential supporting cron jobs with optimized frequencies
    console.log('📅 Creating optimized supporting cron jobs...');
    
    // Market data refresh - every 2 minutes (reduced from 1 minute to avoid conflicts)
    const marketDataQuery = `
      SELECT cron.schedule(
        'optimized-market-data-refresh',
        '*/2 * * * *',
        $$
        SELECT net.http_post(
          url := 'https://ugtaodrvbpfeyhdgmisn.supabase.co/functions/v1/centralized-market-stream',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDA2MDYxNSwiZXhwIjoyMDQ5NjM2NjE1fQ.rXFRPOHZqGdO44dn2Z7jUVKfJXkSkNXU5CjmOL0-YIM"}'::jsonb,
          body := '{"trigger": "supabase_cron"}'::jsonb
        );
        $$
      );
    `;

    const { error: marketError } = await supabase.rpc('sql', { query: marketDataQuery });
    if (marketError) {
      console.error('❌ Error creating optimized market data cron:', marketError);
    } else {
      console.log('✅ Created optimized market data refresh cron (every 2 minutes)');
    }

    // Real-time tick generation - every 30 seconds (reduced frequency)
    const tickGenQuery = `
      SELECT cron.schedule(
        'optimized-tick-generation',
        '*/30 * * * * *',
        $$
        SELECT net.http_post(
          url := 'https://ugtaodrvbpfeyhdgmisn.supabase.co/functions/v1/real-time-tick-generator',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDA2MDYxNSwiZXhwIjoyMDQ5NjM2NjE1fQ.rXFRPOHZqGdO44dn2Z7jUVKfJXkSkNXU5CjmOL0-YIM"}'::jsonb,
          body := '{"trigger": "supabase_cron"}'::jsonb
        );
        $$
      );
    `;

    const { error: tickError } = await supabase.rpc('sql', { query: tickGenQuery });
    if (tickError) {
      console.error('❌ Error creating optimized tick generation cron:', tickError);
    } else {
      console.log('✅ Created optimized tick generation cron (every 30 seconds)');
    }

    // Daily cleanup cron - keep this for maintenance
    const cleanupQuery = `
      SELECT cron.schedule(
        'daily-maintenance-cleanup',
        '0 3 * * *',
        $$
        SELECT public.cleanup_old_signals();
        $$
      );
    `;

    const { error: cleanupError } = await supabase.rpc('sql', { query: cleanupQuery });
    if (cleanupError) {
      console.error('❌ Error creating daily cleanup cron:', cleanupError);
    } else {
      console.log('✅ Created daily maintenance cleanup cron (3 AM UTC)');
    }

    console.log('✅ Cron optimization completed successfully');
    console.log('🎯 GitHub Actions will now handle signal generation exclusively every 5 minutes');
    console.log('📊 Supporting services run at optimized frequencies to avoid conflicts');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron conflicts resolved - GitHub Actions will now run reliably every 5 minutes',
        removedJobs: competingJobs,
        optimizedJobs: [
          'optimized-market-data-refresh (every 2 minutes)',
          'optimized-tick-generation (every 30 seconds)',
          'daily-maintenance-cleanup (daily at 3 AM UTC)'
        ],
        note: 'Signal generation is now exclusively handled by GitHub Actions every 5 minutes',
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
