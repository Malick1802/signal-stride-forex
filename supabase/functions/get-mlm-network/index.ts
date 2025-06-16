
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

    const { affiliateId } = await req.json();

    if (!affiliateId) {
      return new Response(JSON.stringify({ error: 'Affiliate ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the affiliate belongs to the user
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('id', affiliateId)
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return new Response(JSON.stringify({ error: 'Affiliate not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all downline relationships
    const { data: relationships, error: relError } = await supabase
      .from('affiliate_relationships')
      .select(`
        affiliate_id,
        level,
        affiliates!affiliate_relationships_affiliate_id_fkey (
          id,
          affiliate_code,
          total_earnings,
          total_referrals,
          tier,
          status,
          profiles!affiliates_user_id_fkey (
            email,
            full_name
          )
        )
      `)
      .eq('parent_affiliate_id', affiliateId)
      .order('level', { ascending: true });

    if (relError) {
      console.error('Error fetching relationships:', relError);
      return new Response(JSON.stringify({ error: 'Failed to fetch network data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build network tree structure
    const networkMap = new Map();
    const level1Members = [];
    
    let level1Count = 0;
    let level2Count = 0;
    let level3Count = 0;
    let totalDownlineEarnings = 0;

    // Process relationships and build tree
    for (const rel of relationships || []) {
      const member = rel.affiliates;
      const networkMember = {
        id: member.id,
        affiliate_code: member.affiliate_code,
        total_earnings: member.total_earnings,
        total_referrals: member.total_referrals,
        tier: member.tier,
        status: member.status,
        level: rel.level,
        user: {
          email: member.profiles?.email || 'Unknown',
          full_name: member.profiles?.full_name
        },
        children: []
      };

      networkMap.set(member.id, networkMember);
      totalDownlineEarnings += member.total_earnings;

      switch (rel.level) {
        case 1:
          level1Count++;
          level1Members.push(networkMember);
          break;
        case 2:
          level2Count++;
          break;
        case 3:
          level3Count++;
          break;
      }
    }

    // Build hierarchical structure (simplified for now - showing only level 1)
    const network = level1Members;

    const stats = {
      totalDownline: level1Count + level2Count + level3Count,
      level1Count,
      level2Count,
      level3Count,
      totalDownlineEarnings
    };

    console.log(`✅ Network data fetched for affiliate: ${affiliateId}`);

    return new Response(JSON.stringify({ 
      network,
      stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-mlm-network function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
