
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      referralCode, 
      eventType, 
      userId, 
      ipAddress, 
      userAgent, 
      referrer, 
      utmSource, 
      utmMedium, 
      utmCampaign 
    } = await req.json();

    if (!referralCode || !eventType) {
      return new Response(JSON.stringify({ error: 'Referral code and event type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use secure RPC to handle affiliate lookup, event insert, and counters atomically
    // Also try to capture the caller IP from proxy headers when available
    const headerIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || null;

    const { data: result, error: rpcError } = await supabase.rpc('track_referral_event', {
      referral_code: referralCode,
      event_type: eventType,
      user_id_param: userId || null,
      ip_address_param: headerIp || ipAddress || null,
      user_agent_param: userAgent || req.headers.get('user-agent') || null,
      referrer_param: referrer || null,
      utm_source_param: utmSource || null,
      utm_medium_param: utmMedium || null,
      utm_campaign_param: utmCampaign || null,
    });

    if (rpcError) {
      console.error('Error tracking referral via RPC:', rpcError);
      return new Response(JSON.stringify({ error: 'Failed to track event' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle invalid code returned by the RPC
    if (result && (result as any).error) {
      return new Response(JSON.stringify({ error: (result as any).error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const affiliateId = (result as any)?.affiliate_id ?? null;
    console.log(`✅ Tracked ${eventType}${affiliateId ? ` for affiliate: ${affiliateId}` : ''}`);

    return new Response(JSON.stringify({ 
      success: true,
      affiliateId,
      message: `${eventType} tracked successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in track-referral function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
