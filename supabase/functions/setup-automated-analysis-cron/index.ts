
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
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enable pg_cron and pg_net extensions
    await supabase.rpc('enable_extensions', {
      extensions: ['pg_cron', 'pg_net']
    }).catch(() => {
      console.log('Extensions may already be enabled');
    });

    // Create the cron job for automated signal analysis
    const { data, error } = await supabase
      .from('pg_cron')
      .select('*')
      .eq('jobname', 'automated-signal-analysis')
      .maybeSingle();

    if (!data) {
      // Create new cron job
      const { error: cronError } = await supabase.rpc('cron_schedule', {
        job_name: 'automated-signal-analysis',
        cron_schedule: '*/5 * * * *', // Every 5 minutes
        sql_command: `
          SELECT net.http_post(
            url := '${supabaseUrl}/functions/v1/automated-signal-analysis',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${supabaseServiceKey}"}'::jsonb,
            body := '{"trigger": "cron", "timestamp": "' || now() || '"}'::jsonb
          );
        `
      });

      if (cronError) {
        console.error('Error creating cron job:', cronError);
        throw cronError;
      }

      console.log('✅ Automated signal analysis cron job created successfully');
    } else {
      console.log('✅ Automated signal analysis cron job already exists');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Automated signal analysis cron job setup complete',
        schedule: 'Every 5 minutes',
        jobName: 'automated-signal-analysis'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting up automated analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
