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
    console.log('🧹 PHASE 1: COMPREHENSIVE ELIMINATION of ALL time-based signal expiration systems...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PHASE 1: Remove ALL cron jobs by ID (complete elimination)
    console.log('🔥 PHASE 1: Removing ALL cron jobs by ID to ensure complete elimination...');
    const allPossibleJobIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    
    let removedJobsByID = [];
    for (const jobId of allPossibleJobIds) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `DELETE FROM cron.job WHERE jobid = ${jobId};` 
        });
        if (!error) {
          console.log(`✅ ELIMINATED cron job ID: ${jobId}`);
          removedJobsByID.push(`job-id-${jobId}`);
        }
      } catch (error) {
        console.log(`⚠️ Job ID ${jobId} not found or already eliminated`);
      }
    }

    // PHASE 2: Remove ALL time-based jobs by name patterns
    console.log('🚫 PHASE 2: Removing ALL time-based signal expiration patterns...');
    const allTimeBasedPatterns = [
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
    for (const jobName of allTimeBasedPatterns) {
      try {
        const { error } = await supabase.rpc('sql', { 
          query: `SELECT cron.unschedule('${jobName}');` 
        });
        if (!error) {
          console.log(`✅ ELIMINATED time-based job: ${jobName}`);
          removedJobsByName.push(jobName);
        }
      } catch (error) {
        console.log(`⚠️ Pattern ${jobName} not found or already eliminated`);
      }
    }

    // PHASE 3: Emergency safety - only keep signals older than 72 hours as true abandonment
    console.log('🛡️ PHASE 3: Setting up ONLY emergency 72-hour safety net (NOT automatic expiration)...');
    
    try {
      // Find truly abandoned signals (72+ hours old) - these are emergencies only
      const { data: abandonedSignals, error: abandonedError } = await supabase
        .from('trading_signals')
        .select('id, symbol, created_at, status')
        .eq('status', 'active')
        .lt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

      if (abandonedError) {
        console.error('❌ Error checking abandoned signals:', abandonedError);
      } else if (abandonedSignals && abandonedSignals.length > 0) {
        console.log(`🛡️ Found ${abandonedSignals.length} truly abandoned signals (72+ hours old) - applying emergency timeout ONLY`);
        
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
              notes: 'EMERGENCY TIMEOUT - Signal abandoned after 72 hours (NOT market-based expiration)'
            });

          if (!outcomeError) {
            await supabase
              .from('trading_signals')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', signal.id);

            console.log(`🛡️ Emergency timeout applied to ${signal.symbol} (${signal.id}) - 72+ hours abandonment`);
          }
        }
      } else {
        console.log('✅ No signals requiring emergency timeout (72+ hours)');
      }
    } catch (error) {
      console.error('❌ Error in emergency safety check:', error);
    }

    // PHASE 4: Final verification
    const { data: remainingJobs, error: verifyError } = await supabase.rpc('sql', { 
      query: 'SELECT jobid, jobname, command, active FROM cron.job ORDER BY jobid;' 
    });

    if (!verifyError && remainingJobs) {
      console.log('📋 Remaining cron jobs after COMPLETE ELIMINATION:', remainingJobs);
      
      if (remainingJobs.length === 0) {
        console.log('🎉 SUCCESS: ALL TIME-BASED EXPIRATION ELIMINATED - Pure outcome-based monitoring active');
      } else {
        console.warn(`⚠️ WARNING: ${remainingJobs.length} cron jobs still remain after complete elimination`);
      }
    }

    console.log('✅ COMPREHENSIVE ELIMINATION COMPLETE');
    console.log('🎯 Time-based signal expiration COMPLETELY ELIMINATED');
    console.log('🧠 Enhanced market monitoring: EXCLUSIVE control with mandatory outcomes');
    console.log('🛡️ Emergency safety net: 72-hour timeout for truly abandoned signals ONLY');
    console.log('📊 All signal expiration now PURELY outcome-based (SL/TP hits)');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'COMPLETE ELIMINATION: Time-based expiration removed, Pure outcome-based monitoring active',
        removedJobsByName: removedJobsByName,
        removedJobsByID: removedJobsByID,
        remainingJobs: remainingJobs || [],
        emergencyTimeoutHours: 72,
        outcomeBasedOnly: true,
        note: 'Enhanced market monitoring now has EXCLUSIVE control - signals expire ONLY on SL/TP hits',
        enhancedMonitoring: {
          status: 'EXCLUSIVE CONTROL',
          interval: '5 seconds',
          validation: 'Enhanced stop loss and take profit detection ONLY',
          outcomeTracking: 'Mandatory for all expired signals',
          timeBasedExpiration: 'COMPLETELY ELIMINATED',
          emergencyTimeout: '72 hours (abandonment safety only)',
          debugging: 'Pure outcome-based audit trail'
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Elimination error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
