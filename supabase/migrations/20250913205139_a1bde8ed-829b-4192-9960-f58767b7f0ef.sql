-- Update the track_referral_event function to only count subscriptions as conversions
CREATE OR REPLACE FUNCTION public.track_referral_event(
  referral_code text, 
  event_type text, 
  user_id_param uuid DEFAULT NULL::uuid, 
  ip_address_param inet DEFAULT NULL::inet, 
  user_agent_param text DEFAULT NULL::text, 
  referrer_param text DEFAULT NULL::text, 
  utm_source_param text DEFAULT NULL::text, 
  utm_medium_param text DEFAULT NULL::text, 
  utm_campaign_param text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  affiliate_record RECORD;
  referral_link_record RECORD;
  result JSONB;
BEGIN
  -- Find affiliate by code
  SELECT a.id, a.user_id, a.affiliate_code
  INTO affiliate_record
  FROM affiliates a
  WHERE a.affiliate_code = referral_code
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Try to find by referral link code
    SELECT rl.id, rl.affiliate_id, a.user_id, a.affiliate_code
    INTO referral_link_record
    FROM referral_links rl
    JOIN affiliates a ON a.id = rl.affiliate_id
    WHERE rl.link_code = referral_code
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Invalid referral code');
    END IF;
    
    -- Use referral link affiliate
    affiliate_record.id := referral_link_record.affiliate_id;
    affiliate_record.user_id := referral_link_record.user_id;
    affiliate_record.affiliate_code := referral_link_record.affiliate_code;
  END IF;
  
  -- Insert tracking event
  INSERT INTO conversion_tracking (
    affiliate_id,
    referral_link_id,
    event_type,
    user_id,
    ip_address,
    user_agent,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign
  ) VALUES (
    affiliate_record.id,
    COALESCE(referral_link_record.id, NULL),
    event_type,
    user_id_param,
    ip_address_param,
    user_agent_param,
    referrer_param,
    utm_source_param,
    utm_medium_param,
    utm_campaign_param
  );
  
  -- Update referral link stats if applicable
  IF referral_link_record.id IS NOT NULL THEN
    IF event_type = 'click' THEN
      UPDATE referral_links 
      SET clicks = clicks + 1 
      WHERE id = referral_link_record.id;
    ELSIF event_type = 'subscription' THEN
      -- Only count actual subscriptions as conversions, not signups
      UPDATE referral_links 
      SET conversions = conversions + 1 
      WHERE id = referral_link_record.id;
    END IF;
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'affiliate_id', affiliate_record.id,
    'event_type', event_type
  );
  
  RETURN result;
END;
$function$;