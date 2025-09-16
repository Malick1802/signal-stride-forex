import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const fcmServiceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT');

// Helper function to get OAuth2 access token for FCM HTTP v1
async function getFcmAccessToken(): Promise<string> {
  if (!fcmServiceAccountJson) {
    throw new Error("FCM_SERVICE_ACCOUNT not configured");
  }

  const serviceAccount = JSON.parse(fcmServiceAccountJson);
  
  // Create JWT for Google OAuth2
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  // Base64url encode function
  const base64urlEncode = (obj: any) => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64urlEncode(jwtHeader);
  const encodedPayload = base64urlEncode(jwtPayload);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Convert PEM to DER format for private key import
  const pemKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemHeader = '-----BEGIN PRIVATE KEY-----\n';
  const pemFooter = '\n-----END PRIVATE KEY-----';
  
  const pemContents = pemKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  // Import private key for signing
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${unsignedToken}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔥 Push notification request received');
    
    if (!fcmServiceAccountJson) {
      console.error('❌ FCM_SERVICE_ACCOUNT not configured');
      throw new Error('FCM service account not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { title, body, data, userIds, notificationType = 'signal' } = await req.json();

    console.log(`📱 Sending push notification: ${title} to ${userIds?.length || 'all'} users`);

    // Get active users with push tokens (include signal_complete flag)
    let query = supabase
      .from('profiles')
      .select('push_token, device_type, push_enabled, push_new_signals, push_targets_hit, push_stop_loss, push_signal_complete, push_market_updates')
      .not('push_token', 'is', null)
      .eq('push_enabled', true);

    if (userIds && userIds.length > 0) {
      query = query.in('id', userIds);
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) {
      console.error('❌ Error fetching user profiles:', profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('ℹ️ No users found with push tokens');
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No users with push tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter users based on notification preferences (add signal_complete)
    const eligibleProfiles = profiles.filter((profile: any) => {
      switch (notificationType) {
        case 'new_signal':
          return profile.push_new_signals;
        case 'target_hit':
          return profile.push_targets_hit;
        case 'stop_loss':
          return profile.push_stop_loss;
        case 'signal_complete':
          return profile.push_signal_complete;
        case 'market_update':
          return profile.push_market_updates;
        default:
          return true;
      }
    });

    console.log(`📱 Found ${eligibleProfiles.length} eligible users for ${notificationType} notifications`);

    if (eligibleProfiles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: `No users with ${notificationType} notifications enabled` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get access token and prepare FCM HTTP v1 payload
    const accessToken = await getFcmAccessToken();
    const serviceAccount = JSON.parse(fcmServiceAccountJson);
    const projectId = serviceAccount.project_id;

    console.log('🚀 Sending FCM request via HTTP v1...');
    
    // Send notifications using FCM HTTP v1 (individual messages)
    const results = [];
    const invalidTokens = [];

    for (const profile of eligibleProfiles) {
      const fcmPayload = {
        message: {
          token: profile.push_token,
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            type: notificationType,
            timestamp: new Date().toISOString(),
          },
          android: {
            notification: {
              channel_id: notificationType === 'market_update'
                ? 'market_updates_v2'
                : notificationType === 'signal_complete'
                  ? 'trade_alerts_v2'
                  : 'forex_signals_v2',
              sound: 'coin_notification',
            },
            priority: 'high',
          },
          apns: {
            payload: {
              aps: {
                sound: 'coin_notification',
                'content-available': 1,
                alert: {
                  title,
                  body,
                },
                'mutable-content': 1,
              },
            },
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert',
            },
          },
        },
      };

      try {
        const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          results.push({ success: true, token: profile.push_token });
        } else {
          console.warn(`⚠️ FCM send failed for token:`, fcmResult);
          results.push({ success: false, token: profile.push_token, error: fcmResult });
          
          // Check for invalid token errors
          if (fcmResult.error?.code === 'UNREGISTERED' || 
              fcmResult.error?.code === 'INVALID_ARGUMENT') {
            invalidTokens.push(profile.push_token);
          }
        }
      } catch (error) {
        console.error(`❌ Exception sending to token:`, error);
        results.push({ success: false, token: profile.push_token, error: String(error) });
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      console.log(`🧹 Cleaning up ${invalidTokens.length} invalid tokens`);
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .in('push_token', invalidTokens);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Successfully sent ${successCount} push notifications`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      total: eligibleProfiles.length,
      invalidTokensCleaned: invalidTokens.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in send-push-notification:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});