import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// CORS headers for web/app access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");

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

  // Import private key for signing
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(serviceAccount.private_key),
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 FCM Direct: Processing request');
    
    if (!fcmServiceAccountJson) {
      console.error("❌ FCM Direct: FCM_SERVICE_ACCOUNT is not configured");
      return new Response(JSON.stringify({ 
        error: "FCM service account not configured",
        message: "Please configure FCM_SERVICE_ACCOUNT in Supabase Edge Function secrets"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, title = "Test", body = "FCM direct test", data } = await req.json();

    console.log('📱 FCM Direct: Token received', { 
      tokenLength: token?.length || 0, 
      tokenPrefix: token?.substring(0, 30) || 'none'
    });

    if (!token || typeof token !== "string") {
      console.error('❌ FCM Direct: Invalid token provided');
      return new Response(JSON.stringify({ error: "Missing or invalid 'token' in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get access token for FCM HTTP v1
    const accessToken = await getFcmAccessToken();
    const serviceAccount = JSON.parse(fcmServiceAccountJson);
    const projectId = serviceAccount.project_id;

    const payload = {
      message: {
        token: token,
        notification: {
          title,
          body,
        },
        data: {
          ...(data || {}),
          _source: "send-fcm-direct",
          timestamp: Date.now().toString()
        },
        android: {
          notification: {
            channel_id: (data?.type === "market_update")
              ? "market_updates"
              : (data?.type === "signal_complete")
                ? "trade_alerts"
                : "forex_signals",
            sound: "default"
          },
          priority: "high"
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              "content-available": 1
            }
          }
        }
      }
    };

    console.log('📤 FCM Direct: Sending message via HTTP v1', { 
      title: payload.message.notification.title,
      hasData: !!data,
      projectId
    });

    const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await fcmRes.json().catch(() => ({ raw: "no-json" }));

    console.log('📥 FCM Direct: Response received', { 
      status: fcmRes.status,
      ok: fcmRes.ok,
      result: result
    });

    if (!fcmRes.ok) {
      console.error('❌ FCM Direct: Send failed', result);
      return new Response(JSON.stringify({ 
        ok: false, 
        status: fcmRes.status, 
        result,
        error: "FCM send failed"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('✅ FCM Direct: Message sent successfully');
    return new Response(
      JSON.stringify({ 
        ok: true, 
        result,
        message: "FCM message sent successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ FCM Direct: Exception occurred", err);
    return new Response(JSON.stringify({ 
      error: String(err),
      type: "exception"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
