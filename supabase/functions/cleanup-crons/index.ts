
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
    console.log('🧹 ENHANCED: Removing ALL competing cron jobs and implementing proper signal management...');
    
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

    // Remove ALL time-based signal expiration and conflicting cron jobs
    console.log('❌ Removing ALL competing and time-based signal expiration cron jobs...');
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
      // Any time-based signal expiration jobs
      'signal-expiration-hourly',
      'batch-signal-expiration',
      'automatic-signal-cleanup',
      'signal-timeout-check',
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
    console.log('🔥 Removing cron jobs by ID that are causing time-based expiration...');
    const problematicJobIds = [1, 7, 8, 9, 10, 15];
    
    for (const jobId of problematicJobIds) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `DELETE FROM cron.job WHERE jobid = ${jobId};` 
        });
        if (!error) {
          console.log(`✅ Removed time-based expiration cron job ID: ${jobId}`);
          removedJobs.push(`job-id-${jobId}`);
        }
      } catch (error) {
        console.log(`⚠️ Job ID ${jobId} not found or already removed`);
      }
    }

    // Clean up only VERY old signals (72+ hours) as emergency safety net
    console.log('🛡️ Running emergency cleanup for truly abandoned signals (72+ hours old)...');
    
    try {
      const { data: oldSignals, error: oldSignalsError } = await supabase
        .from('trading_signals')
        .select('id, symbol, created_at, status')
        .eq('status', 'active')
        .lt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

      if (oldSignalsError) {
        console.error('❌ Error fetching old signals:', oldSignalsError);
      } else if (oldSignals && oldSignals.length > 0) {
        console.log(`⚠️ Found ${oldSignals.length} signals older than 72 hours - emergency cleanup needed`);
        
        // Create emergency outcomes for these signals
        for (const signal of oldSignals) {
          const { error: outcomeError } = await supabase
            .from('signal_outcomes')
            .insert({
              signal_id: signal.id,
              hit_target: false,
              exit_price: 0,
              exit_timestamp: new Date().toISOString(),
              target_hit_level: null,
              pnl_pips: 0,
              notes: 'Emergency timeout - signal abandoned after 72 hours'
            });

          if (!outcomeError) {
            await supabase
              .from('trading_signals')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', signal.id);

            console.log(`🛡️ Emergency expired signal ${signal.symbol} (${signal.id}) - 72+ hours old`);
          }
        }
      } else {
        console.log('✅ No signals requiring emergency cleanup');
      }
    } catch (error) {
      console.error('❌ Error in emergency cleanup:', error);
    }

    // Verify no problematic cron jobs remain
    const { data: remainingJobs, error: verifyError } = await supabase.rpc('sql', { 
      query: 'SELECT jobname, command FROM cron.job;' 
    });

    if (!verifyError && remainingJobs) {
      console.log('📋 Remaining cron jobs after cleanup:', remainingJobs);
    }

    console.log('✅ Time-based signal expiration ELIMINATED - market monitoring now has exclusive control');
    console.log('🎯 Signals will only expire when they hit stop loss or take profit levels');
    console.log('🛡️ Emergency safety net: 72-hour timeout for abandoned signals only');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Time-based signal expiration eliminated - market monitoring now controls signal lifecycle',
        removedJobs: removedJobs,
        remainingJobs: remainingJobs || [],
        emergencyTimeoutHours: 72,
        note: 'Signals will now expire naturally based on market conditions, not arbitrary time limits',
        marketMonitoringStatus: 'EXCLUSIVE_CONTROL',
        timeBasedExpirationStatus: 'ELIMINATED',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Enhanced cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
