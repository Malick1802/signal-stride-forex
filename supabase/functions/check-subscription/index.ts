
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if subscriber record exists
    const { data: existingSubscriber } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const now = new Date();
    let isTrialActive = false;
    let subscribed = false;
    let subscriptionTier = null;
    let subscriptionEnd = null;
    let trialEnd = null;

    // If no subscriber record exists, create one with a 7-day trial
    if (!existingSubscriber) {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial
      trialEnd = trialEndDate.toISOString();
      isTrialActive = true;
      
      logStep("New user detected, creating 7-day trial", { trialEnd });
      
      await supabaseClient.from("subscribers").insert({
        user_id: user.id,
        email: user.email,
        trial_end: trialEnd,
        is_trial_active: true,
        subscribed: false,
        updated_at: now.toISOString(),
      });

      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        trial_end: trialEnd,
        is_trial_active: true,
        has_access: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check existing trial status
    if (existingSubscriber.trial_end) {
      const trialEndDate = new Date(existingSubscriber.trial_end);
      isTrialActive = now < trialEndDate && !existingSubscriber.subscribed;
      trialEnd = existingSubscriber.trial_end;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check Stripe subscription if user has a customer ID
    if (existingSubscriber.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: existingSubscriber.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        subscribed = true;
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        subscriptionTier = "Unlimited";
        isTrialActive = false; // Active subscription overrides trial
        logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      }
    }

    // Update subscriber record
    await supabaseClient.from("subscribers").upsert({
      user_id: user.id,
      email: user.email,
      stripe_customer_id: existingSubscriber.stripe_customer_id || null,
      subscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      trial_end: trialEnd,
      is_trial_active: isTrialActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    logStep("Updated database with subscription info", { 
      subscribed, 
      subscriptionTier, 
      isTrialActive,
      trialEnd 
    });

    return new Response(JSON.stringify({
      subscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      trial_end: trialEnd,
      is_trial_active: isTrialActive,
      has_access: subscribed || isTrialActive
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
