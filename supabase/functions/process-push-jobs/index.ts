import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");

// Helper function to get OAuth2 access token for FCM HTTP v1
async function getFcmAccessToken(): Promise<string> {
  if (!fcmServiceAccountJson) {
    throw new Error("FCM_SERVICE_ACCOUNT not configured");
  }

  try {
    const serviceAccount = JSON.parse(fcmServiceAccountJson);
    
    // Validate service account structure
    if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
      throw new Error("Invalid FCM service account format. Required fields: client_email, private_key, project_id");
    }
    
    console.log(`🔑 FCM Auth: Using project ${serviceAccount.project_id} with client ${serviceAccount.client_email}`);
  } catch (parseError) {
    console.error("❌ FCM Service Account Parse Error:", parseError);
    throw new Error(`Invalid FCM_SERVICE_ACCOUNT JSON: ${parseError.message}`);
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

type JobType = "new_signal" | "target_hit" | "stop_loss" | "signal_complete" | "market_update";

interface PushJob {
  id: string;
  job_type: JobType;
  payload: any;
  status: string;
  retry_count: number;
  created_at: string;
}

interface ProfileRow {
  push_token: string | null;
  device_type: string | null;
  push_enabled: boolean | null;
  push_new_signals?: boolean | null;
  push_targets_hit?: boolean | null;
  push_stop_loss?: boolean | null;
  push_signal_complete?: boolean | null;
  push_market_updates?: boolean | null;
}

function buildMessage(job: PushJob): { title: string; body: string; data: Record<string, any>; notificationType: JobType } {
  const p = job.payload || {};
  switch (job.job_type) {
    case "new_signal":
      return {
        title: `🚨 New ${p.type} Signal`,
        body: `${p.symbol} - Entry: ${p.price} | SL: ${p.stop_loss}`,
        data: { type: "new_signal", signalId: p.signal_id, symbol: p.symbol },
        notificationType: "new_signal",
      };
    case "target_hit":
      return {
        title: `🎯 Target ${p.target_level} Hit!`,
        body: `${p.symbol} ${p.type} reached TP${p.target_level} at ${Number(p.price).toFixed(5)}`,
        data: { type: "target_hit", signalId: p.signal_id, targetLevel: p.target_level, price: p.price, symbol: p.symbol },
        notificationType: "target_hit",
      };
    case "stop_loss":
      return {
        title: "⛔ Stop Loss Hit",
        body: `${p.symbol} ${p.type} stopped out at ${Number(p.price).toFixed(5)}`,
        data: { type: "stop_loss", signalId: p.signal_id, price: p.price, symbol: p.symbol },
        notificationType: "stop_loss",
      };
    case "signal_complete": {
      const pips = Number(p.pips || 0);
      const emoji = pips > 0 ? "✅" : "❌";
      return {
        title: `${emoji} Signal ${pips > 0 ? "Completed" : "Closed"}`,
        body: `${p.symbol} ${p.type} - ${pips >= 0 ? "+" : ""}${pips} pips`,
        data: { type: "signal_complete", signalId: p.signal_id, pips, symbol: p.symbol, targetLevel: p.target_level, hitTarget: p.hit_target },
        notificationType: "signal_complete",
      };
    }
    case "market_update":
      return {
        title: p.title || "📈 Market Update",
        body: `${p.currency || ""} ${p.impact ? `- ${p.impact} impact` : ""}`.trim(),
        data: { type: "market_update", eventId: p.event_id, currency: p.currency, impact: p.impact },
        notificationType: "market_update",
      };
    default:
      return {
        title: "📱 Notification",
        body: "You have a new alert",
        data: { type: job.job_type },
        notificationType: job.job_type,
      };
  }
}

function filterByPreference(type: JobType, profile: ProfileRow): boolean {
  if (!profile.push_enabled) return false;
  switch (type) {
    case "new_signal":
      return profile.push_new_signals ?? true;
    case "target_hit":
      return profile.push_targets_hit ?? true;
    case "stop_loss":
      return profile.push_stop_loss ?? true;
    case "signal_complete":
      return profile.push_signal_complete ?? true;
    case "market_update":
      return profile.push_market_updates ?? false;
    default:
      return true;
  }
}

async function sendFCM(tokens: string[], title: string, body: string, data: Record<string, any>) {
  if (!fcmServiceAccountJson) throw new Error("FCM_SERVICE_ACCOUNT not configured");
  if (tokens.length === 0) return { sent: 0, results: [] };

  try {
    const accessToken = await getFcmAccessToken();
    const serviceAccount = JSON.parse(fcmServiceAccountJson);
    const projectId = serviceAccount.project_id;

    const results = [];
    
    // Send individual messages for each token (FCM HTTP v1 doesn't support bulk sending)
    for (const token of tokens) {
      const payload = {
        message: {
          token: token,
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            timestamp: new Date().toISOString(),
          },
          android: {
            notification: {
              channel_id: data?.type === "market_update"
                ? "market_updates_v3"
                : data?.type === "signal_complete"
                  ? "trade_alerts_v3"
                  : "forex_signals_v3",
              sound: "coin_notification",
            },
            priority: "high",
          },
          apns: {
            payload: {
              aps: {
                sound: "coin_notification",
                "content-available": 1,
              },
            },
          },
        },
      };

      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      results.push({ 
        token, 
        success: response.ok, 
        result,
        error: response.ok ? null : result.error?.code || 'UNKNOWN_ERROR'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`📥 FCM Response: ${successCount} sent, ${failureCount} failed`);

    return { 
      success: successCount, 
      failure: failureCount,
      results: results
    };
  } catch (error) {
    console.error('❌ FCM Error:', error);
    return { 
      success: 0, 
      failure: tokens.length,
      results: tokens.map(token => ({ token, success: false, error: String(error) }))
    };
  }
}

async function processJob(supabase: ReturnType<typeof createClient>, job: PushJob) {
  console.log(`⚙️ Processing job ${job.id} (${job.job_type})`);

  // Try to lock the job by moving it to processing state if it's still queued
  const { data: locked, error: lockErr } = await supabase
    .from("push_notification_jobs")
    .update({ status: "processing", processed_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "queued")
    .select()
    .single();

  if (lockErr) {
    console.warn("⚠️ Could not lock job:", job.id, lockErr);
    return { processed: false, reason: "lock_failed" };
  }
  if (!locked) {
    console.log("ℹ️ Job already taken by another worker:", job.id);
    return { processed: false, reason: "already_taken" };
  }

  const { title, body, data, notificationType } = buildMessage(job);

  // Fetch eligible profiles
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select(
      "push_token, device_type, push_enabled, push_new_signals, push_targets_hit, push_stop_loss, push_signal_complete, push_market_updates"
    )
    .not("push_token", "is", null)
    .eq("push_enabled", true);

  if (profErr) {
    console.error("❌ Profile query failed:", profErr);
    await supabase
      .from("push_notification_jobs")
      .update({ status: "failed", error: `profile_query: ${profErr.message}` })
      .eq("id", job.id);
    return { processed: false, reason: "profile_query_error" };
  }

  const eligible = (profiles || []).filter((p) => filterByPreference(notificationType, p as ProfileRow)) as ProfileRow[];
  console.log(`📬 Eligible profiles: ${eligible.length}`);

  const tokens = eligible.map((p) => p.push_token!).filter(Boolean);
  if (tokens.length === 0) {
    console.log("ℹ️ No tokens to send; marking job done");
    await supabase.from("push_notification_jobs").update({ status: "done" }).eq("id", job.id);
    return { processed: true, sent: 0 };
  }

  const fcmResult = await sendFCM(tokens, title, body, data);

  // Clean invalid tokens
  if (Array.isArray(fcmResult.results)) {
    const invalidTokens: string[] = [];
    fcmResult.results.forEach((r: any) => {
      if (r.error === "UNREGISTERED" || r.error === "INVALID_ARGUMENT") {
        invalidTokens.push(r.token);
      }
    });
    if (invalidTokens.length > 0) {
      console.log(`🧹 Removing ${invalidTokens.length} invalid tokens`);
      await supabase.from("profiles").update({ push_token: null }).in("push_token", invalidTokens);
    }
  }

  const successCount = fcmResult.success || 0;
  console.log(`✅ Job ${job.id} sent to ${successCount}`);

  await supabase
    .from("push_notification_jobs")
    .update({ status: "done", error: null })
    .eq("id", job.id);

  return { processed: true, sent: successCount };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const source = body?.source || "manual";
    const targetJobId = body?.job_id as string | undefined;

    console.log(`🚀 process-push-jobs invoked (source=${source}, job_id=${targetJobId || "batch"})`);

    // If a specific job_id is provided, try that first; else process up to 10 queued jobs
    let jobs: PushJob[] = [];

    if (targetJobId) {
      const { data: job, error } = await supabase
        .from("push_notification_jobs")
        .select("*")
        .eq("id", targetJobId)
        .single();

      if (error) {
        console.error("❌ Unable to fetch target job:", error);
      } else if (job && job.status === "queued") {
        jobs = [job as PushJob];
      } else {
        console.log("ℹ️ Target job not in queued state or not found; falling back to batch.");
      }
    }

    if (jobs.length === 0) {
      const { data, error } = await supabase
        .from("push_notification_jobs")
        .select("*")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) {
        console.error("❌ Failed to fetch queued jobs:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      jobs = (data || []) as PushJob[];
    }

    if (jobs.length === 0) {
      console.log("👌 No queued jobs to process.");
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const job of jobs) {
      try {
        const r = await processJob(supabase, job);
        results.push({ id: job.id, ...r });
      } catch (e) {
        console.error("❌ Error processing job:", job.id, e);
        await supabase
          .from("push_notification_jobs")
          .update({
            status: "failed",
            error: (e as Error).message,
            retry_count: (job.retry_count || 0) + 1,
          })
          .eq("id", job.id);
        results.push({ id: job.id, processed: false, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("❌ process-push-jobs fatal error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});