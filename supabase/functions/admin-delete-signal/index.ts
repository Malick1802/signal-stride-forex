import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set auth for the admin client
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { signalId } = await req.json()
    
    if (!signalId) {
      return new Response(
        JSON.stringify({ error: 'Signal ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${user.email} attempting to delete signal ${signalId}`)

    // Delete related records first (due to foreign key constraints)
    const { error: outcomeError } = await supabaseAdmin
      .from('signal_outcomes')
      .delete()
      .eq('signal_id', signalId)

    if (outcomeError) {
      console.error('Error deleting signal outcomes:', outcomeError)
    }

    const { error: aiAnalysisError } = await supabaseAdmin
      .from('ai_analysis')
      .delete()
      .eq('signal_id', signalId)

    if (aiAnalysisError) {
      console.error('Error deleting AI analysis:', aiAnalysisError)
    }

    const { error: riskManagementError } = await supabaseAdmin
      .from('professional_risk_management')
      .delete()
      .eq('signal_id', signalId)

    if (riskManagementError) {
      console.error('Error deleting risk management:', riskManagementError)
    }

    // Delete the signal itself
    const { error: signalError } = await supabaseAdmin
      .from('trading_signals')
      .delete()
      .eq('id', signalId)

    if (signalError) {
      console.error('Error deleting signal:', signalError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete signal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Signal ${signalId} successfully deleted by admin ${user.email}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Signal deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-delete-signal function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})