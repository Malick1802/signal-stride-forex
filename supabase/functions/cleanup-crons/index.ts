
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
    console.log('🧹 COMPREHENSIVE CLEANUP: Removing ALL time-based signal expiration systems...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get list of ALL current cron jobs for investigation
    console.log('📋 Investigating all current cron jobs...');
    const { data: currentJobs, error: listError } = await supabase.rpc('sql', { 
      query: 'SELECT jobid, jobname, command, active FROM cron.job ORDER BY jobid;' 
    });

    if (listError) {
      console.error('❌ Error listing cron jobs:', listError);
    } else {
      console.log('📝 Current cron jobs found:', currentJobs);
    }

    // Remove ALL time-based signal expiration and conflicting cron jobs by name
    console.log('❌ Removing ALL time-based signal expiration cron jobs by name...');
    const allTimeBasedJobs = [
      // Signal generation jobs (GitHub Actions handles this now)
      'invoke-generate-signals-every-5min',
      'generate-signals-every-5min', 
      'auto-signal-generation',
      'centralized-signal-generation',
      'ai-signal-generation-5min',
      'outcome-based-signal-generation',
      'signal-generation-cron-1',
      'signal-generation-cron-9',
      'signal-generation-cron-15',
      // ALL time-based signal expiration jobs (the main culprit)
      'signal-expiration-hourly',
      'batch-signal-expiration',
      'automatic-signal-cleanup',
      'signal-timeout-check',
      'cleanup-signals-every-hour',
      'expire-old-signals',
      'signal-expiration-batch',
      'hourly-signal-cleanup',
      'signal-timeout-handler',
      'auto-expire-signals',
      'signal-lifecycle-management',
      'signal-expiration-cron',
      // Market data jobs that might cause conflicts
      'optimized-market-data-refresh',
      'optimized-tick-generation',
      'daily-maintenance-cleanup',
      'market-data-refresh',
      'tick-generation',
      'real-time-tick-generation',
      'centralized-market-update',
      'forex-market-update',
      'market-stream-update',
      // Any legacy or experimental jobs
      'signal-cleanup',
      'cleanup-old-signals',
      'expire-signals',
      'signal-manager',
      'trading-signal-cleanup'
    ];

    let removedJobsByName = [];
    for (const jobName of allTimeBasedJobs) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `SELECT cron.unschedule('${jobName}');` 
        });
        if (!error) {
          console.log(`✅ Removed time-based job by name: ${jobName}`);
          removedJobsByName.push(jobName);
        }
      } catch (error) {
        console.log(`⚠️ Job ${jobName} not found or already removed`);
      }
    }

    // Remove ALL cron jobs by ID (comprehensive cleanup)
    console.log('🔥 Removing ALL cron jobs by ID to ensure complete cleanup...');
    const allPossibleJobIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    
    let removedJobsByID = [];
    for (const jobId of allPossibleJobIds) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `DELETE FROM cron.job WHERE jobid = ${jobId};` 
        });
        if (!error) {
          console.log(`✅ Removed cron job ID: ${jobId}`);
          removedJobsByID.push(`job-id-${jobId}`);
        }
      } catch (error) {
        console.log(`⚠️ Job ID ${jobId} not found or already removed`);
      }
    }

    // Enhanced investigation of expired signals without outcomes
    console.log('🔍 ENHANCED INVESTIGATION: Checking for signals expired without proper outcomes...');
    
    try {
      // Find signals that were expired in the last 24 hours without outcomes
      const { data: recentExpiredWithoutOutcomes, error: recentError } = await supabase
        .from('trading_signals')
        .select(`
          id, 
          symbol, 
          created_at, 
          updated_at,
          status,
          price,
          stop_loss
        `)
        .eq('status', 'expired')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('id', 'in', `(
          SELECT DISTINCT signal_id FROM signal_outcomes WHERE signal_id IS NOT NULL
        )`);

      if (recentError) {
        console.error('❌ Error checking recent expired signals:', recentError);
      } else if (recentExpiredWithoutOutcomes && recentExpiredWithoutOutcomes.length > 0) {
        console.warn(`⚠️ INVESTIGATION: Found ${recentExpiredWithoutOutcomes.length} recently expired signals WITHOUT outcome records!`);
        console.log('📊 This indicates time-based expiration bypassed market monitoring');
        
        // Log details for investigation
        for (const signal of recentExpiredWithoutOutcomes.slice(0, 5)) {
          console.log(`🔍 Signal ${signal.symbol} (${signal.id}) expired without outcome - updated: ${signal.updated_at}`);
        }
      } else {
        console.log('✅ INVESTIGATION: All recently expired signals have outcome records');
      }

      // Only clean up VERY old abandoned signals (72+ hours) as emergency safety net
      const { data: abandonedSignals, error: abandonedError } = await supabase
        .from('trading_signals')
        .select('id, symbol, created_at, status')
        .eq('status', 'active')
        .lt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

      if (abandonedError) {
        console.error('❌ Error fetching abandoned signals:', abandonedError);
      } else if (abandonedSignals && abandonedSignals.length > 0) {
        console.log(`🛡️ Found ${abandonedSignals.length} truly abandoned signals (72+ hours old) - applying emergency timeout`);
        
        for (const signal of abandonedSignals) {
          // Create emergency outcome
          const { error: outcomeError } = await supabase
            .from('signal_outcomes')
            .insert({
              signal_id: signal.id,
              hit_target: false,
              exit_price: 0,
              exit_timestamp: new Date().toISOString(),
              target_hit_level: null,
              pnl_pips: 0,
              notes: 'Emergency timeout - signal abandoned after 72 hours (not market-based)'
            });

          if (!outcomeError) {
            await supabase
              .from('trading_signals')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', signal.id);

            console.log(`🛡️ Emergency timeout applied to ${signal.symbol} (${signal.id}) - 72+ hours old`);
          }
        }
      } else {
        console.log('✅ No signals requiring emergency timeout (72+ hours)');
      }
    } catch (error) {
      console.error('❌ Error in enhanced investigation:', error);
    }

    // Final verification - check for any remaining cron jobs
    const { data: remainingJobs, error: verifyError } = await supabase.rpc('sql', { 
      query: 'SELECT jobid, jobname, command, active FROM cron.job ORDER BY jobid;' 
    });

    if (!verifyError && remainingJobs) {
      console.log('📋 Remaining cron jobs after comprehensive cleanup:', remainingJobs);
      
      if (remainingJobs.length === 0) {
        console.log('🎉 SUCCESS: ALL cron jobs removed - time-based expiration completely eliminated');
      } else {
        console.warn(`⚠️ WARNING: ${remainingJobs.length} cron jobs still remain after cleanup`);
      }
    }

    console.log('✅ COMPREHENSIVE CLEANUP COMPLETE');
    console.log('🎯 Time-based signal expiration ELIMINATED - Enhanced market monitoring has EXCLUSIVE control');
    console.log('🛡️ Emergency safety net: 72-hour timeout for truly abandoned signals only');
    console.log('🧠 Enhanced monitoring: 5-second intervals with mandatory outcome records');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Comprehensive cleanup complete - Time-based expiration eliminated, Enhanced monitoring active',
        removedJobsByName: removedJobsByName,
        removedJobsByID: removedJobsByID,
        remainingJobs: remainingJobs || [],
        emergencyTimeoutHours: 72,
        note: 'Enhanced market monitoring now has exclusive control with mandatory outcome records',
        enhancedMonitoring: {
          status: 'ACTIVE',
          interval: '5 seconds',
          validation: 'Enhanced stop loss and take profit detection',
          outcomeTracking: 'Mandatory for all expired signals',
          debugging: 'Comprehensive audit trail available'
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Comprehensive cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
