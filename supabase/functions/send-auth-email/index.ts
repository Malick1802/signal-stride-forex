import React from 'npm:react@18.3.1'

import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupConfirmationEmail } from './_templates/signup-confirmation.tsx'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string
const resendFrom = Deno.env.get('RESEND_FROM') || 'ForexAlert Pro <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Get authentication mode (lenient allows missing/invalid auth for testing)
  const authMode = Deno.env.get('EMAIL_HOOK_AUTH_MODE') || 'lenient'
  
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
    
    // Validate hook secret exists
    if (!hookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET is not configured')
      return new Response(
        JSON.stringify({ error: 'Email service configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Get and normalize authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const trimmedSecret = hookSecret.trim()
    
    // Normalize the auth header to extract the actual token
    let extractedToken = ''
    if (authHeader) {
      const trimmedHeader = authHeader.trim()
      // Handle both "Bearer <token>" and just "<token>" formats
      if (trimmedHeader.startsWith('Bearer ')) {
        extractedToken = trimmedHeader.substring(7).trim()
      } else {
        extractedToken = trimmedHeader
      }
    }
    
    // Check authorization based on mode
    const isAuthorized = authHeader && extractedToken === trimmedSecret
    
    if (!isAuthorized) {
      // Log diagnostic info (mask secrets for security)
      const headerMasked = authHeader ? `${authHeader.substring(0, 10)}...` : 'none'
      const secretMasked = `${trimmedSecret.substring(0, 6)}...`
      
      console.warn(`Auth validation failed - Mode: ${authMode}, Header: ${headerMasked}, Secret: ${secretMasked}`)
      
      if (authMode === 'strict') {
        return new Response(
          JSON.stringify({ error: 'Unauthorized hook request' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      } else {
        // In lenient mode, log warning but continue processing
        console.warn('Proceeding with email send despite auth failure (lenient mode)')
      }
    } else {
      console.log('Auth validation successful')
    }

    // Parse hook payload directly (Supabase Auth sends JSON)
    const parsed = JSON.parse(payload)
    const user = parsed.user as { email: string; email_confirmed_at?: string }
    const {
      token,
      token_hash,
      redirect_to,
      email_action_type,
      site_url,
    } = parsed.email_data as {
      token: string
      token_hash: string
      redirect_to: string
      email_action_type: string
      site_url: string
    }

    // Build proper callback URL - avoid double hash routes
    const baseUrl = redirect_to.endsWith('/') ? redirect_to.slice(0, -1) : redirect_to
    
    // Check if redirect_to already includes the auth callback route
    const callbackUrl = baseUrl.includes('/#/auth/callback') 
      ? `${baseUrl}?type=${email_action_type}&token_hash=${token_hash}&email=${encodeURIComponent(user.email)}`
      : `${baseUrl}/#/auth/callback?type=${email_action_type}&token_hash=${token_hash}&email=${encodeURIComponent(user.email)}`

    console.log('Auth email webhook triggered:', { 
      email_action_type, 
      user_email: user.email,
      redirect_to,
      callback_url: callbackUrl,
      from_address: resendFrom,
      from_domain: resendFrom.includes('<') ? resendFrom.split('<')[1].split('>')[0].split('@')[1] : resendFrom.split('@')[1]
    })

    let html: string
    let subject: string
    
    // Generate appropriate email based on action type
    switch (email_action_type) {
      case 'signup':
        html = await renderAsync(
          React.createElement(SignupConfirmationEmail, {
            confirmationUrl: callbackUrl,
            userEmail: user.email,
          })
        )
        subject = 'Welcome to ForexAlert Pro - Confirm Your Email'
        break
        
      case 'recovery':
        html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            resetUrl: callbackUrl,
            userEmail: user.email,
          })
        )
        subject = 'Reset Your ForexAlert Pro Password'
        break
        
      default:
        // Fallback for other email types
        html = await renderAsync(
          React.createElement(SignupConfirmationEmail, {
            confirmationUrl: callbackUrl,
            userEmail: user.email,
          })
        )
        subject = 'ForexAlert Pro Authentication'
        break
    }

    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      
      // Handle Resend 403 errors (domain verification issues) gracefully
      if (error.statusCode === 403) {
        const errorMessage = `Resend 403 error: ${error.error || 'Domain verification required'}`
        console.error(errorMessage)
        
        if (authMode === 'lenient') {
          // In lenient mode, don't crash signup - return 200 but log the issue
          console.warn('Returning success despite email failure (lenient mode) - signup will proceed')
          return new Response(
            JSON.stringify({ 
              success: true, 
              warning: 'Email delivery may have failed - check domain verification',
              diagnostic: errorMessage 
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
          )
        }
      }
      
      throw error
    }

    console.log('Email sent successfully:', data)

    return new Response(JSON.stringify({ success: true, messageId: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('Error in send-auth-email function:', error)
    
    // Handle Resend 403 errors (thrown exceptions) gracefully
    if (error.statusCode === 403 || (error.error && typeof error.error === 'string' && error.error.includes('verify a domain'))) {
      const errorMessage = `Resend 403 error: ${error.error || error.message || 'Domain verification required'}`
      console.error(errorMessage)
      
      if (authMode === 'lenient') {
        // In lenient mode, don't crash signup - return 200 but log the issue
        console.warn('Returning success despite email failure (lenient mode) - signup will proceed')
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'Email delivery may have failed - check domain verification',
            diagnostic: errorMessage 
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        )
      }
    }
    
    // Handle webhook signature verification errors
    if (error.message?.includes('signature') || error.message?.includes('verify')) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Final lenient fallback - don't crash signup for any remaining errors
    if (authMode === 'lenient') {
      console.warn('Returning success despite error (lenient mode) - signup will proceed')
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Email service temporarily unavailable',
          diagnostic: error.message || 'Unknown error'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
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