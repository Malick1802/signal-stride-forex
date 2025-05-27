
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
    console.log('🧹 Starting cron cleanup...');
    
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

    console.log('✅ Existing cron jobs cleared');

    // Create a single, clean cron job for signal generation every 5 minutes
    console.log('📅 Creating new cron job for signal generation every 5 minutes...');
    
    const cronQuery = `
      SELECT cron.schedule(
        'ai-signal-generation-5min',
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

    const { error: cronError } = await supabase.rpc('sql', { query: cronQuery });

    if (cronError) {
      console.error('❌ Error creating cron job:', cronError);
      throw cronError;
    }

    console.log('✅ New cron job created successfully: ai-signal-generation-5min');
    console.log('🔄 Signals will now be generated every 5 minutes automatically');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron cleanup completed and new signal generation cron job created',
        cronJob: 'ai-signal-generation-5min (every 5 minutes)',
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
