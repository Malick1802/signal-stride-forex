
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the user from the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaignName } = await req.json();

    // Get user's affiliate data
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, affiliate_code')
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return new Response(JSON.stringify({ error: 'User is not registered as an affiliate' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique link code
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    const linkCode = `${affiliate.affiliate_code}_${timestamp}_${random}`.toUpperCase();

    // Create referral link
    const { data: referralLink, error: linkError } = await supabase
      .from('referral_links')
      .insert({
        affiliate_id: affiliate.id,
        link_code: linkCode,
        campaign_name: campaignName || null
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error creating referral link:', linkError);
      return new Response(JSON.stringify({ error: 'Failed to create referral link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Referral link created: ${linkCode}`);

    return new Response(JSON.stringify({ 
      link: referralLink,
      url: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || 'http://localhost:3000'}?ref=${linkCode}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-referral-link function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
