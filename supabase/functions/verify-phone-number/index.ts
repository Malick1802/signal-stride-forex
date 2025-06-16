
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyRequest {
  phoneNumber: string
  verificationCode: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phoneNumber, verificationCode }: VerifyRequest = await req.json()

    // Get the user from the authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the JWT token and verify it
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Verifying code for ${phoneNumber} from user ${user.id}`)

    // Find the verification code
    const { data: verificationData, error: fetchError } = await supabase
      .from('phone_verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone_number', phoneNumber)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !verificationData) {
      console.log('❌ No valid verification code found')
      return new Response(
        JSON.stringify({ error: 'No valid verification code found or code expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if max attempts exceeded
    if (verificationData.attempts >= 3) {
      console.log('❌ Max verification attempts exceeded')
      return new Response(
        JSON.stringify({ error: 'Maximum verification attempts exceeded. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if code matches
    if (verificationData.verification_code !== verificationCode) {
      // Increment attempts
      await supabase
        .from('phone_verification_codes')
        .update({ attempts: verificationData.attempts + 1 })
        .eq('id', verificationData.id)

      console.log('❌ Invalid verification code')
      return new Response(
        JSON.stringify({ 
          error: 'Invalid verification code',
          attemptsRemaining: 3 - (verificationData.attempts + 1)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Code is correct - mark as verified
    const { error: markVerifiedError } = await supabase
      .from('phone_verification_codes')
      .update({ verified: true })
      .eq('id', verificationData.id)

    if (markVerifiedError) {
      console.error('❌ Error marking code as verified:', markVerifiedError)
      return new Response(
        JSON.stringify({ error: 'Failed to update verification status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user profile to mark phone as verified
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        sms_verified: true,
        phone_number: phoneNumber
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('❌ Error updating profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Phone number verified successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Phone number verified successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Phone verification function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
