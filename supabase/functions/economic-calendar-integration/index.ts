import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EconomicEvent {
  title: string;
  currency: string;
  date: string;
  time: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast?: string;
  previous?: string;
  actual?: string;
}

serve(async (req) => {
  console.log('📅 Economic Calendar Integration Started for 70%+ Win Rate System');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get upcoming economic events (mock data for demo - replace with real API)
    const upcomingEvents = await fetchEconomicEvents();
    
    console.log(`📰 Processing ${upcomingEvents.length} upcoming economic events`);

    // Process and store high-impact events
    const highImpactEvents = upcomingEvents.filter(event => event.impact === 'HIGH');
    
    console.log(`⚡ Found ${highImpactEvents.length} HIGH impact events requiring signal avoidance`);

    const eventRecords = [];

    for (const event of highImpactEvents) {
      // Determine affected currency pairs
      const affectedPairs = getAffectedPairs(event.currency);
      
      // Calculate volatility increase expectation
      const volatilityMultiplier = getVolatilityMultiplier(event.title);
      
      const eventRecord = {
        event_name: event.title,
        currency: event.currency,
        event_time: new Date(`${event.date} ${event.time}`).toISOString(),
        impact_level: event.impact,
        affected_pairs: affectedPairs,
        avoid_minutes_before: getAvoidanceWindow(event.title).before,
        avoid_minutes_after: getAvoidanceWindow(event.title).after,
        volatility_increase_expected: volatilityMultiplier,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Expire in 1 week
      };

      eventRecords.push(eventRecord);
    }

    // Store in database
    if (eventRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('economic_calendar_high_impact')
        .upsert(eventRecords, { onConflict: 'event_name,event_time' });

      if (insertError) {
        console.error('❌ Error storing economic events:', insertError);
        throw insertError;
      }

      console.log(`💾 Stored ${eventRecords.length} high-impact economic events`);
    }

    // Check current time for active avoidance periods
    const now = new Date();
    const { data: activeEvents } = await supabase
      .from('economic_calendar_high_impact')
      .select('*')
      .gte('event_time', new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()) // 4 hours ago
      .lte('event_time', new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()) // 4 hours ahead
      .eq('impact_level', 'HIGH');

    const currentlyAvoidedPairs: string[] = [];
    
    if (activeEvents) {
      for (const event of activeEvents) {
        const eventTime = new Date(event.event_time);
        const avoidStart = new Date(eventTime.getTime() - event.avoid_minutes_before * 60 * 1000);
        const avoidEnd = new Date(eventTime.getTime() + event.avoid_minutes_after * 60 * 1000);
        
        if (now >= avoidStart && now <= avoidEnd) {
          currentlyAvoidedPairs.push(...event.affected_pairs);
          console.log(`🚨 AVOIDING: ${event.affected_pairs.join(', ')} due to ${event.event_name} at ${eventTime.toISOString()}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEvents: upcomingEvents.length,
        highImpactEvents: highImpactEvents.length,
        storedEvents: eventRecords.length,
        currentlyAvoidedPairs: [...new Set(currentlyAvoidedPairs)], // Remove duplicates
        nextHighImpactEvent: highImpactEvents[0] || null,
        avoidanceStatus: currentlyAvoidedPairs.length > 0 ? 'ACTIVE' : 'CLEAR',
        message: `Economic calendar integration complete. ${currentlyAvoidedPairs.length > 0 ? 'Signal generation restricted for some pairs.' : 'All pairs clear for signal generation.'}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Economic calendar integration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Fetch economic events (mock implementation - replace with real economic calendar API)
async function fetchEconomicEvents(): Promise<EconomicEvent[]> {
  // In production, this would call a real economic calendar API like Forex Factory, Trading Economics, etc.
  // For demo purposes, returning mock high-impact events
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return [
    {
      title: 'Non-Farm Payrolls',
      currency: 'USD',
      date: tomorrow.toISOString().split('T')[0],
      time: '13:30',
      impact: 'HIGH'
    },
    {
      title: 'Federal Reserve Interest Rate Decision',
      currency: 'USD', 
      date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '19:00',
      impact: 'HIGH'
    },
    {
      title: 'ECB Interest Rate Decision',
      currency: 'EUR',
      date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '12:45',
      impact: 'HIGH'
    },
    {
      title: 'Bank of England Interest Rate Decision',
      currency: 'GBP',
      date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '12:00',
      impact: 'HIGH'
    },
    {
      title: 'Bank of Japan Interest Rate Decision',
      currency: 'JPY',
      date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '03:00',
      impact: 'HIGH'
    }
  ];
}

// Get currency pairs affected by economic events
function getAffectedPairs(currency: string): string[] {
  const pairMap: { [key: string]: string[] } = {
    'USD': ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    'EUR': ['EURUSD', 'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'EURNZD'],
    'GBP': ['GBPUSD', 'EURGBP', 'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD'],
    'JPY': ['USDJPY', 'EURJPY', 'GBPJPY', 'CHFJPY', 'CADJPY', 'AUDJPY', 'NZDJPY'],
    'CHF': ['USDCHF', 'EURCHF', 'GBPCHF', 'CHFJPY', 'CADCHF', 'AUDCHF', 'NZDCHF'],
    'CAD': ['USDCAD', 'EURCAD', 'GBPCAD', 'CADJPY', 'CADCHF', 'AUDCAD', 'NZDCAD'],
    'AUD': ['AUDUSD', 'EURAUD', 'GBPAUD', 'AUDJPY', 'AUDCHF', 'AUDCAD', 'AUDNZD'],
    'NZD': ['NZDUSD', 'EURNZD', 'GBPNZD', 'NZDJPY', 'NZDCHF', 'NZDCAD', 'AUDNZD']
  };

  return pairMap[currency] || [];
}

// Get volatility multiplier based on event type
function getVolatilityMultiplier(eventTitle: string): number {
  const highVolatilityEvents = [
    'Non-Farm Payrolls',
    'Interest Rate Decision',
    'FOMC Meeting',
    'GDP',
    'CPI',
    'Unemployment Rate'
  ];

  for (const highVolEvent of highVolatilityEvents) {
    if (eventTitle.includes(highVolEvent)) {
      return 2.5; // 2.5x normal volatility expected
    }
  }

  return 1.5; // Default volatility increase
}

// Get avoidance window based on event importance
function getAvoidanceWindow(eventTitle: string): { before: number; after: number } {
  // Ultra-important events (Central Bank decisions, NFP)
  if (eventTitle.includes('Interest Rate Decision') || 
      eventTitle.includes('Non-Farm Payrolls') ||
      eventTitle.includes('FOMC')) {
    return { before: 90, after: 120 }; // 1.5 hours before, 2 hours after
  }
  
  // Important economic data (GDP, CPI, Employment)
  if (eventTitle.includes('GDP') || 
      eventTitle.includes('CPI') || 
      eventTitle.includes('Unemployment')) {
    return { before: 60, after: 90 }; // 1 hour before, 1.5 hours after
  }
  
  // Default high-impact events
  return { before: 30, after: 60 }; // 30 minutes before, 1 hour after
}