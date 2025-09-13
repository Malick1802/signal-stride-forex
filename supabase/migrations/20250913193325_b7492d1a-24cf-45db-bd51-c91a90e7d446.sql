-- Create edge function for tracking referrals
CREATE OR REPLACE FUNCTION track_referral_event(
  referral_code TEXT,
  event_type TEXT,
  user_id_param UUID DEFAULT NULL,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  referrer_param TEXT DEFAULT NULL,
  utm_source_param TEXT DEFAULT NULL,
  utm_medium_param TEXT DEFAULT NULL,
  utm_campaign_param TEXT DEFAULT NULL
) RETURNS JSONB AS $$
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
    ELSIF event_type IN ('signup', 'subscription') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION track_referral_event TO authenticated;

-- Create function to distribute commission when subscription occurs
CREATE OR REPLACE FUNCTION distribute_subscription_commission(
  referral_user_id UUID,
  subscription_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  level_1_affiliate_id UUID;
  level_2_affiliate_id UUID;
  level_3_affiliate_id UUID;
  commission_l1 NUMERIC;
  commission_l2 NUMERIC;
  commission_l3 NUMERIC;
  rate_l1 NUMERIC := 0.30; -- 30%
  rate_l2 NUMERIC := 0.10; -- 10%
  rate_l3 NUMERIC := 0.05; -- 5%
BEGIN
  -- Find the affiliate who referred this user (level 1)
  SELECT ar.parent_affiliate_id
  INTO level_1_affiliate_id
  FROM affiliate_relationships ar
  WHERE ar.affiliate_id IN (
    SELECT a.id FROM affiliates a WHERE a.user_id = referral_user_id
  )
  AND ar.level = 1
  LIMIT 1;
  
  IF level_1_affiliate_id IS NOT NULL THEN
    -- Calculate and create level 1 commission
    commission_l1 := subscription_amount * rate_l1;
    
    INSERT INTO affiliate_commissions (
      affiliate_id,
      referral_user_id,
      amount,
      commission_type,
      level,
      status
    ) VALUES (
      level_1_affiliate_id,
      referral_user_id,
      commission_l1,
      'subscription',
      1,
      'approved'
    );
    
    -- Update affiliate total earnings
    UPDATE affiliates 
    SET total_earnings = total_earnings + commission_l1,
        total_referrals = total_referrals + 1
    WHERE id = level_1_affiliate_id;
    
    -- Find level 2 affiliate
    SELECT ar.parent_affiliate_id
    INTO level_2_affiliate_id
    FROM affiliate_relationships ar
    WHERE ar.affiliate_id = level_1_affiliate_id
    AND ar.level = 1
    LIMIT 1;
    
    IF level_2_affiliate_id IS NOT NULL THEN
      -- Calculate and create level 2 commission
      commission_l2 := subscription_amount * rate_l2;
      
      INSERT INTO affiliate_commissions (
        affiliate_id,
        referral_user_id,
        amount,
        commission_type,
        level,
        status
      ) VALUES (
        level_2_affiliate_id,
        referral_user_id,
        commission_l2,
        'subscription',
        2,
        'approved'
      );
      
      -- Update affiliate total earnings
      UPDATE affiliates 
      SET total_earnings = total_earnings + commission_l2
      WHERE id = level_2_affiliate_id;
      
      -- Find level 3 affiliate
      SELECT ar.parent_affiliate_id
      INTO level_3_affiliate_id
      FROM affiliate_relationships ar
      WHERE ar.affiliate_id = level_2_affiliate_id
      AND ar.level = 1
      LIMIT 1;
      
      IF level_3_affiliate_id IS NOT NULL THEN
        -- Calculate and create level 3 commission
        commission_l3 := subscription_amount * rate_l3;
        
        INSERT INTO affiliate_commissions (
          affiliate_id,
          referral_user_id,
          amount,
          commission_type,
          level,
          status
        ) VALUES (
          level_3_affiliate_id,
          referral_user_id,
          commission_l3,
          'subscription',
          3,
          'approved'
        );
        
        -- Update affiliate total earnings
        UPDATE affiliates 
        SET total_earnings = total_earnings + commission_l3
        WHERE id = level_3_affiliate_id;
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'level_1_commission', COALESCE(commission_l1, 0),
    'level_2_commission', COALESCE(commission_l2, 0),
    'level_3_commission', COALESCE(commission_l3, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION distribute_subscription_commission TO service_role;