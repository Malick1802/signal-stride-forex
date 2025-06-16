
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

    const { parentCode } = await req.json();

    console.log(`🎯 Registering affiliate for user: ${user.id}, parent code: ${parentCode}`);

    // Check if user is already an affiliate
    const { data: existingAffiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingAffiliate) {
      return new Response(JSON.stringify({ error: 'User is already registered as an affiliate' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique affiliate code
    const { data: affiliateCode, error: codeError } = await supabase.rpc('generate_affiliate_code');
    if (codeError) {
      console.error('Error generating affiliate code:', codeError);
      return new Response(JSON.stringify({ error: 'Failed to generate affiliate code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create affiliate record
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        affiliate_code: affiliateCode,
        status: 'pending' // Requires admin approval
      })
      .select()
      .single();

    if (affiliateError) {
      console.error('Error creating affiliate:', affiliateError);
      return new Response(JSON.stringify({ error: 'Failed to create affiliate record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build MLM hierarchy if parent code provided
    if (parentCode) {
      const { error: hierarchyError } = await supabase.rpc('build_mlm_hierarchy', {
        new_affiliate_id: affiliate.id,
        parent_code: parentCode
      });

      if (hierarchyError) {
        console.error('Error building MLM hierarchy:', hierarchyError);
        // Don't fail the registration, just log the error
      }
    }

    // Create default referral link
    const defaultLinkCode = `${affiliateCode}_DEFAULT`;
    const { error: linkError } = await supabase
      .from('referral_links')
      .insert({
        affiliate_id: affiliate.id,
        link_code: defaultLinkCode,
        campaign_name: 'Default'
      });

    if (linkError) {
      console.error('Error creating default referral link:', linkError);
      // Don't fail registration for this
    }

    console.log(`✅ Affiliate registered successfully: ${affiliate.id}`);

    return new Response(JSON.stringify({ 
      affiliate,
      message: 'Affiliate registration successful. Pending approval.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in register-affiliate function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
