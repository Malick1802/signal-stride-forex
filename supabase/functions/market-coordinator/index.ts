import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketState {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: string;
  change24h: number;
  changePercentage: number;
  isMarketOpen: boolean;
  sessionId: string;
  dataVersion: number;
}

interface SynchronizationPacket {
  type: 'market_update' | 'signal_update' | 'session_sync' | 'heartbeat';
  data: any;
  timestamp: number;
  sessionId: string;
  dataVersion: number;
  broadcastId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Market Coordinator - Centralizing real-time synchronization...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, payload } = await req.json().catch(() => ({ action: 'sync', payload: {} }));
    
    console.log(`📊 Market Coordinator Action: ${action}`);
    
    switch (action) {
      case 'sync_all_markets':
        return await syncAllMarkets(supabase);
        
      case 'sync_signals':
        return await syncSignals(supabase);
        
      case 'broadcast_update':
        return await broadcastUpdate(supabase, payload);
        
      case 'get_session_state':
        return await getSessionState(supabase, payload.sessionId);
        
      default:
        return await performFullSync(supabase);
    }

  } catch (error) {
    console.error('💥 Market Coordinator Error:', error);
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

async function syncAllMarkets(supabase: any) {
  console.log('🌐 Syncing all market data for centralized coordination...');
  
  // First, trigger fresh market data update
  const { data: marketStreamResult, error: streamError } = await supabase.functions.invoke('centralized-market-stream');
  
  if (streamError) {
    console.error('❌ Market stream error:', streamError);
  } else {
    console.log('✅ Market stream updated:', marketStreamResult);
  }
  
  // Get all current market states
  const { data: marketStates, error: statesError } = await supabase
    .from('centralized_market_state')
    .select('*')
    .order('last_update', { ascending: false });

  if (statesError) {
    throw new Error(`Failed to fetch market states: ${statesError.message}`);
  }

  // Get all active signals
  const { data: activeSignals, error: signalsError } = await supabase
    .from('trading_signals')
    .select('*')
    .eq('status', 'active')
    .eq('is_centralized', true)
    .order('created_at', { ascending: false });

  if (signalsError) {
    throw new Error(`Failed to fetch signals: ${signalsError.message}`);
  }

  // Create synchronization packet
  const syncPacket: SynchronizationPacket = {
    type: 'market_update',
    data: {
      marketStates: marketStates || [],
      activeSignals: activeSignals || [],
      totalPairs: marketStates?.length || 0,
      totalSignals: activeSignals?.length || 0
    },
    timestamp: Date.now(),
    sessionId: 'coordinator',
    dataVersion: Date.now(),
    broadcastId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  // Broadcast to all real-time channels
  await broadcastToAllChannels(supabase, syncPacket);

  console.log(`✅ Market sync complete: ${marketStates?.length || 0} pairs, ${activeSignals?.length || 0} signals`);

  return new Response(
    JSON.stringify({
      success: true,
      syncPacket,
      stats: {
        marketPairs: marketStates?.length || 0,
        activeSignals: activeSignals?.length || 0,
        dataVersion: syncPacket.dataVersion
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncSignals(supabase: any) {
  console.log('📡 Syncing trading signals for cross-device coordination...');
  
  // Get all active centralized signals with performance data
  const { data: signals, error } = await supabase
    .from('trading_signals')
    .select(`
      *,
      signal_outcomes(*)
    `)
    .eq('status', 'active')
    .eq('is_centralized', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to sync signals: ${error.message}`);
  }

  // Get current market prices for performance calculation
  const symbols = signals?.map(s => s.symbol) || [];
  const { data: marketPrices } = await supabase
    .from('centralized_market_state')
    .select('symbol, current_price, fastforex_price')
    .in('symbol', symbols);

  // Enhance signals with current performance
  const enhancedSignals = signals?.map(signal => {
    const marketPrice = marketPrices?.find(p => p.symbol === signal.symbol);
    const currentPrice = marketPrice?.fastforex_price || marketPrice?.current_price || signal.price;
    
    return {
      ...signal,
      current_price: currentPrice,
      synchronized_at: new Date().toISOString()
    };
  }) || [];

  const syncPacket: SynchronizationPacket = {
    type: 'signal_update',
    data: {
      signals: enhancedSignals,
      totalActive: enhancedSignals.length,
      lastSync: new Date().toISOString()
    },
    timestamp: Date.now(),
    sessionId: 'coordinator',
    dataVersion: Date.now(),
    broadcastId: `signal_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  await broadcastToAllChannels(supabase, syncPacket);

  console.log(`✅ Signals synced: ${enhancedSignals.length} active signals`);

  return new Response(
    JSON.stringify({
      success: true,
      syncPacket,
      stats: {
        activeSignals: enhancedSignals.length,
        enhancedSignals: enhancedSignals.length
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function broadcastUpdate(supabase: any, payload: any) {
  console.log('📢 Broadcasting coordinated update to all clients...');
  
  const broadcastPacket: SynchronizationPacket = {
    type: payload.type || 'market_update',
    data: payload.data || {},
    timestamp: Date.now(),
    sessionId: payload.sessionId || 'coordinator',
    dataVersion: Date.now(),
    broadcastId: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  await broadcastToAllChannels(supabase, broadcastPacket);

  return new Response(
    JSON.stringify({
      success: true,
      broadcasted: true,
      broadcastId: broadcastPacket.broadcastId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSessionState(supabase: any, sessionId: string) {
  console.log(`🔍 Getting session state for: ${sessionId}`);
  
  // Get current global state
  const { data: marketStates } = await supabase
    .from('centralized_market_state')
    .select('*')
    .order('last_update', { ascending: false });

  const { data: activeSignals } = await supabase
    .from('trading_signals')
    .select('*')
    .eq('status', 'active')
    .eq('is_centralized', true);

  return new Response(
    JSON.stringify({
      success: true,
      sessionState: {
        sessionId,
        marketStates: marketStates || [],
        activeSignals: activeSignals || [],
        dataVersion: Date.now(),
        synchronized_at: new Date().toISOString()
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function performFullSync(supabase: any) {
  console.log('🔄 Performing full market and signal synchronization...');
  
  // Trigger market data update
  const marketSync = await syncAllMarkets(supabase);
  
  // Wait for market data to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Trigger signal sync
  const signalSync = await syncSignals(supabase);
  
  return new Response(
    JSON.stringify({
      success: true,
      fullSync: true,
      marketSync: true,
      signalSync: true,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function broadcastToAllChannels(supabase: any, packet: SynchronizationPacket) {
  console.log(`📡 Broadcasting ${packet.type} to all real-time channels...`);
  
  // Store the synchronization packet in a coordination table for persistence
  try {
    const { error: insertError } = await supabase
      .from('market_coordination_log')
      .insert({
        packet_type: packet.type,
        packet_data: packet.data,
        session_id: packet.sessionId,
        data_version: packet.dataVersion,
        broadcast_id: packet.broadcastId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError && !insertError.message.includes('does not exist')) {
      console.warn('⚠️ Could not log coordination packet:', insertError);
    }
  } catch (error) {
    console.warn('⚠️ Coordination logging not available (table may not exist)');
  }

  // The real-time broadcasting happens through database triggers
  // This function serves as the central coordination point
  console.log(`✅ Coordination packet processed: ${packet.broadcastId}`);
}