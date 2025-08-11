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
    if (!fcmServerKey) {
      console.error("FCM_SERVER_KEY is not configured");
      return new Response(JSON.stringify({ error: "FCM server key not configured" }), {
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

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'token' in body" }), {
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
      },
      data: {
        ...(data || {}),
        _source: "send-fcm-direct",
      },
    };

    const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await fcmRes.json().catch(() => ({ raw: "no-json" }));

    // Log FCM response for diagnostics
    console.log("FCM response status:", fcmRes.status);
    console.log("FCM response body:", result);

    if (!fcmRes.ok) {
      return new Response(JSON.stringify({ ok: false, status: fcmRes.status, result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect invalid token errors and hint to clean up on the client/DB flow
    const invalid = Array.isArray(result?.results)
      ? result.results.find((r: any) => r?.error)
      : undefined;

    return new Response(
      JSON.stringify({ ok: true, result, invalidTokenError: invalid?.error }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error in send-fcm-direct:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
