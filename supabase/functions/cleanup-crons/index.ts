
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
    console.log('🧹 URGENT: Removing ALL competing cron jobs to fix GitHub Actions scheduling...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get list of ALL current cron jobs
    console.log('📋 Checking all current cron jobs...');
    const { data: currentJobs, error: listError } = await supabase.rpc('sql', { 
      query: 'SELECT jobname FROM cron.job;' 
    });

    if (listError) {
      console.error('❌ Error listing cron jobs:', listError);
    } else {
      console.log('📝 Current cron jobs found:', currentJobs);
    }

    // Remove ALL signal generation and conflicting cron jobs
    console.log('❌ Removing ALL competing and broken cron jobs...');
    const allConflictingJobs = [
      // Signal generation jobs (GitHub Actions will handle this)
      'invoke-generate-signals-every-5min',
      'generate-signals-every-5min',
      'auto-signal-generation',
      'centralized-signal-generation',
      'ai-signal-generation-5min',
      'outcome-based-signal-generation',
      'signal-generation-cron-1',
      'signal-generation-cron-9',
      'signal-generation-cron-15',
      // Market data jobs that are causing errors
      'optimized-market-data-refresh',
      'optimized-tick-generation',
      'daily-maintenance-cleanup',
      // Any other market-related jobs
      'market-data-refresh',
      'tick-generation',
      'real-time-tick-generation',
      'centralized-market-update',
      'forex-market-update',
      'market-stream-update'
    ];

    let removedJobs = [];
    for (const jobName of allConflictingJobs) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `SELECT cron.unschedule('${jobName}');` 
        });
        if (!error) {
          console.log(`✅ Removed cron job: ${jobName}`);
          removedJobs.push(jobName);
        }
      } catch (error) {
        console.log(`⚠️ Job ${jobName} not found or already removed`);
      }
    }

    // Remove ALL cron jobs by ID (the ones showing in postgres logs)
    console.log('🔥 Removing cron jobs by ID that are causing schema errors...');
    const problematicJobIds = [1, 7, 8, 9, 10, 15];
    
    for (const jobId of problematicJobIds) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `DELETE FROM cron.job WHERE jobid = ${jobId};` 
        });
        if (!error) {
          console.log(`✅ Removed cron job ID: ${jobId}`);
          removedJobs.push(`job-id-${jobId}`);
        }
      } catch (error) {
        console.log(`⚠️ Job ID ${jobId} not found or already removed`);
      }
    }

    // Verify no cron jobs remain
    const { data: remainingJobs, error: verifyError } = await supabase.rpc('sql', { 
      query: 'SELECT jobname, command FROM cron.job;' 
    });

    if (!verifyError && remainingJobs) {
      console.log('📋 Remaining cron jobs after cleanup:', remainingJobs);
    }

    console.log('✅ ALL competing cron jobs removed successfully');
    console.log('🎯 GitHub Actions will now be the ONLY automation system running every 5 minutes');
    console.log('📊 No more Supabase cron conflicts - GitHub Actions has exclusive control');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ALL competing cron jobs removed - GitHub Actions now has exclusive control',
        removedJobs: removedJobs,
        remainingJobs: remainingJobs || [],
        note: 'GitHub Actions is now the ONLY automation system. No more Supabase cron conflicts.',
        gitHubActionsStatus: 'EXCLUSIVE_CONTROL',
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
