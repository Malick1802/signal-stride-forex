import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the requesting user and verify admin role
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      console.error('Role check error:', roleError)
      return new Response('Forbidden - Admin access required', { status: 403, headers: corsHeaders })
    }

    // Get the user ID to delete from request body
    const { userId } = await req.json()
    
    if (!userId) {
      return new Response('User ID is required', { status: 400, headers: corsHeaders })
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response('Cannot delete your own account', { status: 400, headers: corsHeaders })
    }

    console.log('Admin user attempting to delete user:', { adminId: user.id, targetUserId: userId })

    // Delete the user from auth.users (this will cascade to related tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user', 
          details: deleteError.message,
          code: deleteError.code || 'AUTH_DELETE_ERROR'
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Clean up any remaining public data that might not cascade
    try {
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
      console.log('Cleaned up related public data for user:', userId)
    } catch (cleanupError) {
      console.warn('Error cleaning up public data (may not exist):', cleanupError)
      // Don't fail the whole operation for cleanup errors
    }

    console.log('User deleted successfully:', userId)

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error in admin-delete-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})