import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    
    if (!fcmServiceAccountJson) {
      return new Response(JSON.stringify({ 
        error: "FCM_SERVICE_ACCOUNT not configured",
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("🔍 FCM Service Account JSON (first 100 chars):", fcmServiceAccountJson.substring(0, 100));

    try {
      const serviceAccount = JSON.parse(fcmServiceAccountJson);
      
      // Check required fields
      const requiredFields = ['client_email', 'private_key', 'project_id'];
      const missingFields = requiredFields.filter(field => !serviceAccount[field]);
      
      if (missingFields.length > 0) {
        return new Response(JSON.stringify({
          error: `Missing required fields: ${missingFields.join(', ')}`,
          success: false,
          fieldCheck: {
            client_email: !!serviceAccount.client_email,
            private_key: !!serviceAccount.private_key,
            project_id: !!serviceAccount.project_id
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "FCM Service Account is properly configured",
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKeyPresent: !!serviceAccount.private_key
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (parseError) {
      return new Response(JSON.stringify({
        error: `Invalid JSON format: ${parseError.message}`,
        success: false,
        rawLength: fcmServiceAccountJson.length
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      error: `Server error: ${error.message}`,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});