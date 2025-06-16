
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  to: string
  message: string
  type: 'new_signal' | 'target_hit' | 'stop_loss' | 'signal_complete'
  userId: string
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

    const { to, message, type, userId }: SMSRequest = await req.json()

    console.log(`📱 SMS Request: ${type} to ${to} for user ${userId}`)

    // Get user's SMS preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('sms_notifications_enabled, sms_new_signals, sms_targets_hit, sms_stop_loss, sms_verified')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if SMS notifications are enabled
    if (!profile.sms_notifications_enabled) {
      console.log('📵 SMS notifications disabled for user')
      return new Response(
        JSON.stringify({ message: 'SMS notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if phone number is verified
    if (!profile.sms_verified) {
      console.log('📵 Phone number not verified for user')
      return new Response(
        JSON.stringify({ message: 'Phone number not verified' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check specific notification preferences
    const shouldSend = {
      new_signal: profile.sms_new_signals,
      target_hit: profile.sms_targets_hit,
      stop_loss: profile.sms_stop_loss,
      signal_complete: profile.sms_targets_hit // Use target hit preference for completion
    }

    if (!shouldSend[type]) {
      console.log(`📵 SMS type ${type} disabled for user`)
      return new Response(
        JSON.stringify({ message: `SMS notifications for ${type} disabled` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ Missing Twilio credentials')
      return new Response(
        JSON.stringify({ error: 'Twilio not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const body = new URLSearchParams({
      From: fromNumber,
      To: to,
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
        JSON.stringify({ error: 'Failed to send SMS', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ SMS sent successfully: ${result.sid}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        status: result.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ SMS function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
