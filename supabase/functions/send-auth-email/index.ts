import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupConfirmationEmail } from './_templates/signup-confirmation.tsx'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

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
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    // Handle potential Base64 encoding issues with hook secret
    let processedHookSecret = hookSecret
    if (!processedHookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET is not configured')
      return new Response(
        JSON.stringify({ error: 'Email service configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Try to decode if it looks like Base64, otherwise use as-is
    try {
      if (processedHookSecret.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(processedHookSecret)) {
        processedHookSecret = atob(processedHookSecret)
      }
    } catch (e) {
      console.warn('Hook secret Base64 decode failed, using as plain text:', e.message)
    }
    
    const wh = new Webhook(processedHookSecret)
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type, site_url },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
        email_confirmed_at?: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    console.log('Auth email webhook triggered:', { 
      email_action_type, 
      user_email: user.email,
      redirect_to 
    })

    let html: string
    let subject: string
    
    // Generate appropriate email based on action type
    switch (email_action_type) {
      case 'signup':
        html = await renderAsync(
          React.createElement(SignupConfirmationEmail, {
            confirmationUrl: `${redirect_to}?type=${email_action_type}&token_hash=${token_hash}&email=${encodeURIComponent(user.email)}`,
            userEmail: user.email,
          })
        )
        subject = 'Welcome to ForexAlert Pro - Confirm Your Email'
        break
        
      case 'recovery':
        html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            resetUrl: `${redirect_to}?type=${email_action_type}&token_hash=${token_hash}&email=${encodeURIComponent(user.email)}`,
            userEmail: user.email,
          })
        )
        subject = 'Reset Your ForexAlert Pro Password'
        break
        
      default:
        // Fallback for other email types
        html = await renderAsync(
          React.createElement(SignupConfirmationEmail, {
            confirmationUrl: `${redirect_to}?type=${email_action_type}&token_hash=${token_hash}&email=${encodeURIComponent(user.email)}`,
            userEmail: user.email,
          })
        )
        subject = 'ForexAlert Pro Authentication'
        break
    }

    const { data, error } = await resend.emails.send({
      from: 'ForexAlert Pro <onboarding@resend.dev>',
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully:', data)

    return new Response(JSON.stringify({ success: true, messageId: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('Error in send-auth-email function:', error)
    
    // Handle webhook signature verification errors
    if (error.message?.includes('signature') || error.message?.includes('verify')) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})