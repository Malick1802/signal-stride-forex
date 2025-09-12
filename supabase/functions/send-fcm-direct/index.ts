import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// CORS headers for web/app access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 FCM Direct: Processing request');
    
    if (!fcmServerKey) {
      console.error("❌ FCM Direct: FCM_SERVER_KEY is not configured");
      return new Response(JSON.stringify({ 
        error: "FCM server key not configured",
        message: "Please configure FCM_SERVER_KEY in Supabase Edge Function secrets"
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

    const payload = {
      to: token,
      priority: "high",
      notification: {
        title,
        body,
        sound: "default",
        android_channel_id: (data?.type === "market_update")
          ? "market_updates"
          : (data?.type === "signal_complete")
            ? "trade_alerts"
            : "forex_signals",
      },
      data: {
        ...(data || {}),
        _source: "send-fcm-direct",
        timestamp: Date.now().toString()
      },
      content_available: true
    };

    console.log('📤 FCM Direct: Sending message', { 
      title: payload.notification.title,
      hasData: !!data 
    });

    const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${fcmServerKey}`,
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

    // Detect invalid token errors and hint to clean up on the client/DB flow
    const invalid = Array.isArray(result?.results)
      ? result.results.find((r: any) => r?.error)
      : undefined;

    if (invalid) {
      console.warn('⚠️ FCM Direct: Invalid token detected', invalid);
    }

    console.log('✅ FCM Direct: Message sent successfully');
    return new Response(
      JSON.stringify({ 
        ok: true, 
        result, 
        invalidTokenError: invalid?.error,
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
