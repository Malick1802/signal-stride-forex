
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerificationRequest {
  phoneNumber: string
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

    const { phoneNumber }: VerificationRequest = await req.json()

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

    console.log(`📱 Verification SMS request for ${phoneNumber} from user ${user.id}`)

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Check for existing unexpired verification codes
    const { data: existingCodes, error: checkError } = await supabase
      .from('phone_verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone_number', phoneNumber)
      .gt('expires_at', new Date().toISOString())
      .eq('verified', false)

    if (checkError) {
      console.error('❌ Error checking existing codes:', checkError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If there's an existing unexpired code, update it instead of creating new
    if (existingCodes && existingCodes.length > 0) {
      const { error: updateError } = await supabase
        .from('phone_verification_codes')
        .update({
          verification_code: verificationCode,
          attempts: 0,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
        })
        .eq('id', existingCodes[0].id)

      if (updateError) {
        console.error('❌ Error updating verification code:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update verification code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Store verification code in database
      const { error: insertError } = await supabase
        .from('phone_verification_codes')
        .insert({
          user_id: user.id,
          phone_number: phoneNumber,
          verification_code: verificationCode,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
        })

      if (insertError) {
        console.error('❌ Error storing verification code:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to store verification code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ Missing Twilio credentials')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send verification SMS via Twilio
    const message = `Your verification code is: ${verificationCode}. This code expires in 5 minutes.`
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const body = new URLSearchParams({
      From: fromNumber,
      To: phoneNumber,
      Body: message
    })

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ Twilio API error:', result)
      return new Response(
        JSON.stringify({ error: 'Failed to send verification SMS', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Verification SMS sent successfully: ${result.sid}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
        messageSid: result.sid 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Verification SMS function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
