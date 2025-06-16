
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

    // Find the affiliate by referral code or link code
    let affiliateId = null;
    let referralLinkId = null;

    // First try to find by affiliate code
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', referralCode)
      .eq('status', 'active')
      .single();

    if (affiliate) {
      affiliateId = affiliate.id;
    } else {
      // Try to find by referral link code
      const { data: referralLink } = await supabase
        .from('referral_links')
        .select('id, affiliate_id')
        .eq('link_code', referralCode)
        .eq('is_active', true)
        .single();

      if (referralLink) {
        affiliateId = referralLink.affiliate_id;
        referralLinkId = referralLink.id;
      }
    }

    if (!affiliateId) {
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Track the event
    const { error: trackingError } = await supabase
      .from('conversion_tracking')
      .insert({
        affiliate_id: affiliateId,
        referral_link_id: referralLinkId,
        user_id: userId || null,
        event_type: eventType,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign
      });

    if (trackingError) {
      console.error('Error tracking event:', trackingError);
      return new Response(JSON.stringify({ error: 'Failed to track event' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update click/conversion counts for referral links
    if (referralLinkId) {
      if (eventType === 'click') {
        await supabase
          .from('referral_links')
          .update({ clicks: supabase.raw('clicks + 1') })
          .eq('id', referralLinkId);
      } else if (eventType === 'conversion' || eventType === 'subscription') {
        await supabase
          .from('referral_links')
          .update({ conversions: supabase.raw('conversions + 1') })
          .eq('id', referralLinkId);
      }
    }

    console.log(`✅ Tracked ${eventType} for affiliate: ${affiliateId}`);

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
