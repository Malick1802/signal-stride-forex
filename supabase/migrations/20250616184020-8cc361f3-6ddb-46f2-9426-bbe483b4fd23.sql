
-- Create affiliate tables for MLM system
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  affiliate_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  commission_rate_l1 DECIMAL(5,4) NOT NULL DEFAULT 0.30, -- 30% for direct referrals
  commission_rate_l2 DECIMAL(5,4) NOT NULL DEFAULT 0.10, -- 10% for level 2
  commission_rate_l3 DECIMAL(5,4) NOT NULL DEFAULT 0.05, -- 5% for level 3
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create affiliate relationships for MLM hierarchy
CREATE TABLE public.affiliate_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  parent_affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(affiliate_id, parent_affiliate_id)
);

-- Create commission tracking table
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id TEXT, -- Stripe subscription ID
  commission_type TEXT NOT NULL CHECK (commission_type IN ('signup_bonus', 'recurring_monthly', 'recurring_annual')),
  amount DECIMAL(10,2) NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payout_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create affiliate payouts table
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer')),
  payment_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  stripe_transfer_id TEXT,
  notes TEXT
);

-- Create referral links tracking
CREATE TABLE public.referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  link_code TEXT UNIQUE NOT NULL,
  campaign_name TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create conversion tracking table
CREATE TABLE public.conversion_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_link_id UUID REFERENCES public.referral_links(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'subscription', 'conversion')),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliates table
CREATE POLICY "Affiliates can view their own data"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Affiliates can update their own data"
  ON public.affiliates FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for affiliate_relationships
CREATE POLICY "Affiliates can view their relationships"
  ON public.affiliate_relationships FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()) OR
    parent_affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

-- RLS Policies for affiliate_commissions
CREATE POLICY "Affiliates can view their commissions"
  ON public.affiliate_commissions FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- RLS Policies for affiliate_payouts
CREATE POLICY "Affiliates can view their payouts"
  ON public.affiliate_payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliates can request payouts"
  ON public.affiliate_payouts FOR INSERT
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- RLS Policies for referral_links
CREATE POLICY "Affiliates can manage their referral links"
  ON public.referral_links FOR ALL
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- RLS Policies for conversion_tracking
CREATE POLICY "Affiliates can view their conversion data"
  ON public.conversion_tracking FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX idx_affiliate_relationships_affiliate ON public.affiliate_relationships(affiliate_id);
CREATE INDEX idx_affiliate_relationships_parent ON public.affiliate_relationships(parent_affiliate_id);
CREATE INDEX idx_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_commissions_referral_user ON public.affiliate_commissions(referral_user_id);
CREATE INDEX idx_payouts_affiliate ON public.affiliate_payouts(affiliate_id);
CREATE INDEX idx_referral_links_affiliate ON public.referral_links(affiliate_id);
CREATE INDEX idx_referral_links_code ON public.referral_links(link_code);
CREATE INDEX idx_conversion_tracking_affiliate ON public.conversion_tracking(affiliate_id);

-- Create function to generate unique affiliate codes
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.affiliates WHERE affiliate_code = code) INTO exists;
    
    -- If code doesn't exist, use it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically build MLM hierarchy
CREATE OR REPLACE FUNCTION build_mlm_hierarchy(new_affiliate_id UUID, parent_code TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  parent_affiliate_id UUID;
  grandparent_affiliate_id UUID;
  great_grandparent_affiliate_id UUID;
BEGIN
  -- If no parent code provided, this is a top-level affiliate
  IF parent_code IS NULL THEN
    RETURN;
  END IF;
  
  -- Find parent affiliate
  SELECT id INTO parent_affiliate_id 
  FROM public.affiliates 
  WHERE affiliate_code = parent_code AND status = 'active';
  
  -- If parent not found, exit
  IF parent_affiliate_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Create Level 1 relationship (direct parent)
  INSERT INTO public.affiliate_relationships (affiliate_id, parent_affiliate_id, level)
  VALUES (new_affiliate_id, parent_affiliate_id, 1);
  
  -- Find grandparent (Level 2)
  SELECT parent_affiliate_id INTO grandparent_affiliate_id
  FROM public.affiliate_relationships
  WHERE affiliate_id = parent_affiliate_id AND level = 1;
  
  IF grandparent_affiliate_id IS NOT NULL THEN
    INSERT INTO public.affiliate_relationships (affiliate_id, parent_affiliate_id, level)
    VALUES (new_affiliate_id, grandparent_affiliate_id, 2);
    
    -- Find great-grandparent (Level 3)
    SELECT parent_affiliate_id INTO great_grandparent_affiliate_id
    FROM public.affiliate_relationships
    WHERE affiliate_id = grandparent_affiliate_id AND level = 1;
    
    IF great_grandparent_affiliate_id IS NOT NULL THEN
      INSERT INTO public.affiliate_relationships (affiliate_id, parent_affiliate_id, level)
      VALUES (new_affiliate_id, great_grandparent_affiliate_id, 3);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate and distribute MLM commissions
CREATE OR REPLACE FUNCTION distribute_mlm_commission(
  referral_user_id UUID,
  subscription_amount DECIMAL,
  commission_type TEXT,
  subscription_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  referring_affiliate_id UUID;
  level1_affiliate_id UUID;
  level2_affiliate_id UUID;
  level3_affiliate_id UUID;
  level1_rate DECIMAL;
  level2_rate DECIMAL;
  level3_rate DECIMAL;
  level1_amount DECIMAL;
  level2_amount DECIMAL;
  level3_amount DECIMAL;
BEGIN
  -- Find the referring affiliate through conversion tracking
  SELECT affiliate_id INTO referring_affiliate_id
  FROM public.conversion_tracking
  WHERE user_id = referral_user_id 
    AND event_type = 'signup'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no referring affiliate found, exit
  IF referring_affiliate_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get Level 1 affiliate (direct referrer) and commission rate
  SELECT id, commission_rate_l1 INTO level1_affiliate_id, level1_rate
  FROM public.affiliates
  WHERE id = referring_affiliate_id AND status = 'active';
  
  -- Calculate and create Level 1 commission
  IF level1_affiliate_id IS NOT NULL THEN
    level1_amount := subscription_amount * level1_rate;
    
    INSERT INTO public.affiliate_commissions (
      affiliate_id, referral_user_id, subscription_id, commission_type, amount, level
    ) VALUES (
      level1_affiliate_id, referral_user_id, subscription_id, commission_type, level1_amount, 1
    );
    
    -- Update affiliate total earnings
    UPDATE public.affiliates 
    SET total_earnings = total_earnings + level1_amount,
        total_referrals = total_referrals + CASE WHEN commission_type = 'signup_bonus' THEN 1 ELSE 0 END
    WHERE id = level1_affiliate_id;
  END IF;
  
  -- Get Level 2 affiliate and commission rate
  SELECT ar.parent_affiliate_id, a.commission_rate_l2 
  INTO level2_affiliate_id, level2_rate
  FROM public.affiliate_relationships ar
  JOIN public.affiliates a ON a.id = ar.parent_affiliate_id
  WHERE ar.affiliate_id = level1_affiliate_id AND ar.level = 1 AND a.status = 'active';
  
  -- Calculate and create Level 2 commission
  IF level2_affiliate_id IS NOT NULL THEN
    level2_amount := subscription_amount * level2_rate;
    
    INSERT INTO public.affiliate_commissions (
      affiliate_id, referral_user_id, subscription_id, commission_type, amount, level
    ) VALUES (
      level2_affiliate_id, referral_user_id, subscription_id, commission_type, level2_amount, 2
    );
    
    -- Update affiliate total earnings
    UPDATE public.affiliates 
    SET total_earnings = total_earnings + level2_amount
    WHERE id = level2_affiliate_id;
  END IF;
  
  -- Get Level 3 affiliate and commission rate
  SELECT ar.parent_affiliate_id, a.commission_rate_l3 
  INTO level3_affiliate_id, level3_rate
  FROM public.affiliate_relationships ar
  JOIN public.affiliates a ON a.id = ar.parent_affiliate_id
  WHERE ar.affiliate_id = level2_affiliate_id AND ar.level = 1 AND a.status = 'active';
  
  -- Calculate and create Level 3 commission
  IF level3_affiliate_id IS NOT NULL THEN
    level3_amount := subscription_amount * level3_rate;
    
    INSERT INTO public.affiliate_commissions (
      affiliate_id, referral_user_id, subscription_id, commission_type, amount, level
    ) VALUES (
      level3_affiliate_id, referral_user_id, subscription_id, commission_type, level3_amount, 3
    );
    
    -- Update affiliate total earnings
    UPDATE public.affiliates 
    SET total_earnings = total_earnings + level3_amount
    WHERE id = level3_affiliate_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update affiliate updated_at timestamp
CREATE OR REPLACE FUNCTION update_affiliate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_updated_at();
