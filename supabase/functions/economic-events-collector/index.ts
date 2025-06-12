
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
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('📅 Economic events collection starting...');

    // Generate simulated economic events for the next 7 days
    const events = generateSimulatedEconomicEvents();

    // Insert events into database
    const { data: insertedEvents, error: insertError } = await supabase
      .from('economic_events')
      .upsert(events, { 
        onConflict: 'title,event_time',
        ignoreDuplicates: true 
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting economic events:', insertError);
      throw insertError;
    }

    console.log(`✅ Economic events collection complete: ${insertedEvents?.length || 0} events`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Collected ${insertedEvents?.length || 0} economic events`,
        events_collected: insertedEvents?.length || 0,
        events: insertedEvents,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Economic events collection error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateSimulatedEconomicEvents() {
  const now = new Date();
  const events = [];
  
  const eventTemplates = [
    { title: 'Non-Farm Payrolls', currency: 'USD', impact: 'High', sentiment: 0.2 },
    { title: 'Federal Reserve Interest Rate Decision', currency: 'USD', impact: 'High', sentiment: 0.1 },
    { title: 'ECB Interest Rate Decision', currency: 'EUR', impact: 'High', sentiment: 0.0 },
    { title: 'UK GDP Growth Rate', currency: 'GBP', impact: 'High', sentiment: -0.1 },
    { title: 'Bank of Japan Policy Rate', currency: 'JPY', impact: 'High', sentiment: -0.2 },
    { title: 'US Consumer Price Index', currency: 'USD', impact: 'High', sentiment: 0.1 },
    { title: 'Eurozone Inflation Rate', currency: 'EUR', impact: 'Medium', sentiment: 0.0 },
    { title: 'UK Employment Change', currency: 'GBP', impact: 'Medium', sentiment: 0.1 },
    { title: 'Australian Employment Change', currency: 'AUD', impact: 'Medium', sentiment: 0.0 },
    { title: 'Canadian Employment Change', currency: 'CAD', impact: 'Medium', sentiment: 0.1 },
    { title: 'US Trade Balance', currency: 'USD', impact: 'Medium', sentiment: -0.1 },
    { title: 'German Manufacturing PMI', currency: 'EUR', impact: 'Medium', sentiment: 0.0 },
    { title: 'UK Services PMI', currency: 'GBP', impact: 'Low', sentiment: 0.1 },
    { title: 'US Retail Sales', currency: 'USD', impact: 'Medium', sentiment: 0.1 },
    { title: 'Eurozone Consumer Confidence', currency: 'EUR', impact: 'Low', sentiment: 0.0 }
  ];

  // Generate events for next 7 days
  for (let day = 0; day < 7; day++) {
    const eventsPerDay = Math.floor(Math.random() * 4) + 1; // 1-4 events per day
    
    for (let i = 0; i < eventsPerDay; i++) {
      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      const eventTime = new Date(now.getTime() + (day * 24 * 60 * 60 * 1000) + (Math.random() * 24 * 60 * 60 * 1000));
      
      // Generate forecast and previous values
      const baseValue = Math.random() * 100;
      const forecast = (baseValue + (Math.random() - 0.5) * 10).toFixed(1);
      const previous = (baseValue + (Math.random() - 0.5) * 15).toFixed(1);
      
      events.push({
        title: template.title,
        currency: template.currency,
        impact_level: template.impact,
        event_time: eventTime.toISOString(),
        forecast_value: forecast + '%',
        previous_value: previous + '%',
        sentiment_score: template.sentiment + (Math.random() - 0.5) * 0.2,
        created_at: new Date().toISOString()
      });
    }
  }

  return events;
}
