import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔥 Push notification request received');
    
    if (!fcmServerKey) {
      console.error('❌ FCM_SERVER_KEY not configured');
      throw new Error('FCM server key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { title, body, data, userIds, notificationType = 'signal' } = await req.json();

    console.log(`📱 Sending push notification: ${title} to ${userIds?.length || 'all'} users`);

    // Get active users with push tokens
    let query = supabase
      .from('profiles')
      .select('push_token, device_type, push_enabled, push_new_signals, push_targets_hit, push_stop_loss, push_market_updates')
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

    // Filter users based on notification preferences
    const eligibleProfiles = profiles.filter(profile => {
      switch (notificationType) {
        case 'new_signal':
          return profile.push_new_signals;
        case 'target_hit':
          return profile.push_targets_hit;
        case 'stop_loss':
          return profile.push_stop_loss;
        case 'market_update':
          return profile.push_market_updates;
        default:
          return true;
      }
    });

    console.log(`📱 Found ${eligibleProfiles.length} eligible users for ${notificationType} notifications`);

    const fcmPayload = {
      registration_ids: eligibleProfiles.map(p => p.push_token),
      priority: 'high',
      content_available: true,
      notification: {
        title,
        body,
        sound: 'default',
        badge: '1'
      },
      data: {
        ...data,
        type: notificationType,
        timestamp: new Date().toISOString(),
        title,
        body
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: 'forex_signals',
          priority: 'high',
          sound: 'default',
          default_sound: true,
          default_vibrate_timings: true,
          default_light_settings: true,
          visibility: 1,
          importance: 'high',
          notification_priority: 2
        },
        data: {
          ...data,
          type: notificationType,
          timestamp: new Date().toISOString()
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body
            },
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        }
      }
    };

    console.log('🚀 Sending FCM request...');
    
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmResult = await fcmResponse.json();
    console.log('📱 FCM Response:', fcmResult);

    // Handle invalid tokens
    if (fcmResult.results) {
      const invalidTokens = [];
      fcmResult.results.forEach((result: any, index: number) => {
        if (result.error === 'InvalidRegistration' || result.error === 'NotRegistered') {
          invalidTokens.push(eligibleProfiles[index].push_token);
        }
      });

      // Clean up invalid tokens
      if (invalidTokens.length > 0) {
        console.log(`🧹 Cleaning up ${invalidTokens.length} invalid tokens`);
        await supabase
          .from('profiles')
          .update({ push_token: null })
          .in('push_token', invalidTokens);
      }
    }

    const successCount = fcmResult.success || 0;
    console.log(`✅ Successfully sent ${successCount} push notifications`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      total: eligibleProfiles.length,
      fcmResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in send-push-notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});