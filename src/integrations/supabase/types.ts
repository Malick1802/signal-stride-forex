export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          admin_user_id: string
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          commission_type: string
          created_at: string | null
          id: string
          level: number
          payout_id: string | null
          referral_user_id: string
          status: string
          subscription_id: string | null
          transaction_date: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          commission_type: string
          created_at?: string | null
          id?: string
          level: number
          payout_id?: string | null
          referral_user_id: string
          status?: string
          subscription_id?: string | null
          transaction_date?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          commission_type?: string
          created_at?: string | null
          id?: string
          level?: number
          payout_id?: string | null
          referral_user_id?: string
          status?: string
          subscription_id?: string | null
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          id: string
          notes: string | null
          payment_details: Json | null
          payment_method: string
          processed_at: string | null
          requested_at: string | null
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          id?: string
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          id?: string
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_relationships: {
        Row: {
          affiliate_id: string
          created_at: string | null
          id: string
          level: number
          parent_affiliate_id: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          id?: string
          level: number
          parent_affiliate_id?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          id?: string
          level?: number
          parent_affiliate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_relationships_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_relationships_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          commission_rate_l1: number
          commission_rate_l2: number
          commission_rate_l3: number
          created_at: string | null
          id: string
          status: string
          tier: string
          total_earnings: number
          total_referrals: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_code: string
          commission_rate_l1?: number
          commission_rate_l2?: number
          commission_rate_l3?: number
          created_at?: string | null
          id?: string
          status?: string
          tier?: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_code?: string
          commission_rate_l1?: number
          commission_rate_l2?: number
          commission_rate_l3?: number
          created_at?: string | null
          id?: string
          status?: string
          tier?: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_analysis: {
        Row: {
          analysis_text: string
          confidence_score: number | null
          created_at: string | null
          id: string
          market_conditions: Json | null
          signal_id: string | null
        }
        Insert: {
          analysis_text: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          market_conditions?: Json | null
          signal_id?: string | null
        }
        Update: {
          analysis_text?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          market_conditions?: Json | null
          signal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_signals: {
        Row: {
          cached_at: string
          id: string
          processed: boolean
          signal_data: Json
          signal_id: string
          user_id: string
        }
        Insert: {
          cached_at?: string
          id?: string
          processed?: boolean
          signal_data: Json
          signal_id: string
          user_id: string
        }
        Update: {
          cached_at?: string
          id?: string
          processed?: boolean
          signal_data?: Json
          signal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cached_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      centralized_market_state: {
        Row: {
          ask: number | null
          bid: number | null
          current_price: number
          id: string
          is_market_open: boolean | null
          last_update: string
          price_change_24h: number | null
          source: string | null
          symbol: string
          volume_24h: number | null
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          current_price: number
          id?: string
          is_market_open?: boolean | null
          last_update?: string
          price_change_24h?: number | null
          source?: string | null
          symbol: string
          volume_24h?: number | null
        }
        Update: {
          ask?: number | null
          bid?: number | null
          current_price?: number
          id?: string
          is_market_open?: boolean | null
          last_update?: string
          price_change_24h?: number | null
          source?: string | null
          symbol?: string
          volume_24h?: number | null
        }
        Relationships: []
      }
      chart_patterns: {
        Row: {
          confidence_score: number
          created_at: string
          detected_at: string
          id: string
          pattern_type: string
          resistance_level: number | null
          support_level: number | null
          symbol: string
          target_price: number | null
        }
        Insert: {
          confidence_score: number
          created_at?: string
          detected_at: string
          id?: string
          pattern_type: string
          resistance_level?: number | null
          support_level?: number | null
          symbol: string
          target_price?: number | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          detected_at?: string
          id?: string
          pattern_type?: string
          resistance_level?: number | null
          support_level?: number | null
          symbol?: string
          target_price?: number | null
        }
        Relationships: []
      }
      comprehensive_market_data: {
        Row: {
          close_price: number
          created_at: string
          high_price: number
          id: string
          low_price: number
          open_price: number
          symbol: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          close_price: number
          created_at?: string
          high_price: number
          id?: string
          low_price: number
          open_price: number
          symbol: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          close_price?: number
          created_at?: string
          high_price?: number
          id?: string
          low_price?: number
          open_price?: number
          symbol?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      conversion_tracking: {
        Row: {
          affiliate_id: string
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          referral_link_id: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          referral_link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          referral_link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_tracking_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_tracking_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_events: {
        Row: {
          actual_value: string | null
          created_at: string
          currency: string
          event_time: string
          forecast_value: string | null
          id: string
          impact_level: string
          previous_value: string | null
          sentiment_score: number | null
          title: string
        }
        Insert: {
          actual_value?: string | null
          created_at?: string
          currency: string
          event_time: string
          forecast_value?: string | null
          id?: string
          impact_level: string
          previous_value?: string | null
          sentiment_score?: number | null
          title: string
        }
        Update: {
          actual_value?: string | null
          created_at?: string
          currency?: string
          event_time?: string
          forecast_value?: string | null
          id?: string
          impact_level?: string
          previous_value?: string | null
          sentiment_score?: number | null
          title?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          status: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      live_market_data: {
        Row: {
          ask: number | null
          bid: number | null
          created_at: string | null
          id: string
          price: number
          source: string | null
          symbol: string
          timestamp: string | null
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          created_at?: string | null
          id?: string
          price: number
          source?: string | null
          symbol: string
          timestamp?: string | null
        }
        Update: {
          ask?: number | null
          bid?: number | null
          created_at?: string | null
          id?: string
          price?: number
          source?: string | null
          symbol?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      live_price_history: {
        Row: {
          ask: number | null
          bid: number | null
          created_at: string
          id: string
          price: number
          source: string | null
          symbol: string
          timestamp: string
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          created_at?: string
          id?: string
          price: number
          source?: string | null
          symbol: string
          timestamp?: string
        }
        Update: {
          ask?: number | null
          bid?: number | null
          created_at?: string
          id?: string
          price?: number
          source?: string | null
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      market_data: {
        Row: {
          change_24h: number | null
          high_24h: number | null
          id: string
          low_24h: number | null
          price: number
          source: string | null
          symbol: string
          timestamp: string
          type: string | null
          volume: number | null
        }
        Insert: {
          change_24h?: number | null
          high_24h?: number | null
          id?: string
          low_24h?: number | null
          price: number
          source?: string | null
          symbol: string
          timestamp?: string
          type?: string | null
          volume?: number | null
        }
        Update: {
          change_24h?: number | null
          high_24h?: number | null
          id?: string
          low_24h?: number | null
          price?: number
          source?: string | null
          symbol?: string
          timestamp?: string
          type?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      market_sentiment: {
        Row: {
          created_at: string
          id: string
          institutional_bias: string | null
          news_sentiment: number | null
          retail_long_percentage: number | null
          retail_short_percentage: number | null
          sentiment_label: string
          sentiment_score: number
          symbol: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          institutional_bias?: string | null
          news_sentiment?: number | null
          retail_long_percentage?: number | null
          retail_short_percentage?: number | null
          sentiment_label: string
          sentiment_score: number
          symbol: string
          timestamp: string
        }
        Update: {
          created_at?: string
          id?: string
          institutional_bias?: string | null
          news_sentiment?: number | null
          retail_long_percentage?: number | null
          retail_short_percentage?: number | null
          sentiment_label?: string
          sentiment_score?: number
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          user_id: string
          verification_code: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          phone_number: string
          user_id: string
          verification_code: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
          user_id?: string
          verification_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          push_market_updates: boolean | null
          push_new_signals: boolean | null
          push_notifications_enabled: boolean | null
          push_signal_complete: boolean | null
          push_sound_enabled: boolean | null
          push_stop_loss: boolean | null
          push_targets_hit: boolean | null
          push_vibration_enabled: boolean | null
          sms_new_signals: boolean | null
          sms_notifications_enabled: boolean | null
          sms_stop_loss: boolean | null
          sms_targets_hit: boolean | null
          sms_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          push_market_updates?: boolean | null
          push_new_signals?: boolean | null
          push_notifications_enabled?: boolean | null
          push_signal_complete?: boolean | null
          push_sound_enabled?: boolean | null
          push_stop_loss?: boolean | null
          push_targets_hit?: boolean | null
          push_vibration_enabled?: boolean | null
          sms_new_signals?: boolean | null
          sms_notifications_enabled?: boolean | null
          sms_stop_loss?: boolean | null
          sms_targets_hit?: boolean | null
          sms_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          push_market_updates?: boolean | null
          push_new_signals?: boolean | null
          push_notifications_enabled?: boolean | null
          push_signal_complete?: boolean | null
          push_sound_enabled?: boolean | null
          push_stop_loss?: boolean | null
          push_targets_hit?: boolean | null
          push_vibration_enabled?: boolean | null
          sms_new_signals?: boolean | null
          sms_notifications_enabled?: boolean | null
          sms_stop_loss?: boolean | null
          sms_targets_hit?: boolean | null
          sms_verified?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      real_trades: {
        Row: {
          created_at: string | null
          entry_price: number
          entry_time: string | null
          exit_price: number | null
          exit_time: string | null
          id: string
          lot_size: number
          notes: string | null
          pnl_pips: number | null
          signal_id: string | null
          status: string
          target_hit_level: number | null
        }
        Insert: {
          created_at?: string | null
          entry_price: number
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lot_size: number
          notes?: string | null
          pnl_pips?: number | null
          signal_id?: string | null
          status: string
          target_hit_level?: number | null
        }
        Update: {
          created_at?: string | null
          entry_price?: number
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lot_size?: number
          notes?: string | null
          pnl_pips?: number | null
          signal_id?: string | null
          status?: string
          target_hit_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "real_trades_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          affiliate_id: string
          campaign_name: string | null
          clicks: number
          conversions: number
          created_at: string | null
          id: string
          is_active: boolean | null
          link_code: string
        }
        Insert: {
          affiliate_id: string
          campaign_name?: string | null
          clicks?: number
          conversions?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          link_code: string
        }
        Update: {
          affiliate_id?: string
          campaign_name?: string | null
          clicks?: number
          conversions?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          link_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets: {
        Row: {
          created_at: string
          id: string
          name: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          value?: string
        }
        Relationships: []
      }
      signal_outcomes: {
        Row: {
          exit_price: number
          exit_timestamp: string | null
          hit_target: boolean
          id: string
          notes: string | null
          pnl_pips: number
          signal_id: string
          target_hit_level: number | null
        }
        Insert: {
          exit_price: number
          exit_timestamp?: string | null
          hit_target: boolean
          id?: string
          notes?: string | null
          pnl_pips: number
          signal_id: string
          target_hit_level?: number | null
        }
        Update: {
          exit_price?: number
          exit_timestamp?: string | null
          hit_target?: boolean
          id?: string
          notes?: string | null
          pnl_pips?: number
          signal_id?: string
          target_hit_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_outcomes_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: true
            referencedRelation: "trading_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_trial_active: boolean | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_trial_active?: boolean | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_trial_active?: boolean | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          signals_per_day: number
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          signals_per_day: number
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          signals_per_day?: number
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supported_pairs: {
        Row: {
          base_currency: string | null
          created_at: string
          id: string
          instrument_type: string | null
          is_active: boolean | null
          name: string | null
          quote_currency: string | null
          symbol: string
        }
        Insert: {
          base_currency?: string | null
          created_at?: string
          id?: string
          instrument_type?: string | null
          is_active?: boolean | null
          name?: string | null
          quote_currency?: string | null
          symbol: string
        }
        Update: {
          base_currency?: string | null
          created_at?: string
          id?: string
          instrument_type?: string | null
          is_active?: boolean | null
          name?: string | null
          quote_currency?: string | null
          symbol?: string
        }
        Relationships: []
      }
      technical_indicators: {
        Row: {
          atr_14: number | null
          bb_lower: number | null
          bb_middle: number | null
          bb_upper: number | null
          created_at: string
          ema_200: number | null
          ema_50: number | null
          id: string
          macd_histogram: number | null
          macd_line: number | null
          macd_signal: number | null
          rsi_14: number | null
          symbol: string
          timeframe: string
          timestamp: string
        }
        Insert: {
          atr_14?: number | null
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          created_at?: string
          ema_200?: number | null
          ema_50?: number | null
          id?: string
          macd_histogram?: number | null
          macd_line?: number | null
          macd_signal?: number | null
          rsi_14?: number | null
          symbol: string
          timeframe?: string
          timestamp: string
        }
        Update: {
          atr_14?: number | null
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          created_at?: string
          ema_200?: number | null
          ema_50?: number | null
          id?: string
          macd_histogram?: number | null
          macd_line?: number | null
          macd_signal?: number | null
          rsi_14?: number | null
          symbol?: string
          timeframe?: string
          timestamp?: string
        }
        Relationships: []
      }
      trading_instruments: {
        Row: {
          base_currency: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_priority: boolean | null
          min_lot_size: number | null
          name: string | null
          pip_value: number | null
          quote_currency: string | null
          symbol: string
          type: Database["public"]["Enums"]["instrument_type"]
        }
        Insert: {
          base_currency?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_priority?: boolean | null
          min_lot_size?: number | null
          name?: string | null
          pip_value?: number | null
          quote_currency?: string | null
          symbol: string
          type?: Database["public"]["Enums"]["instrument_type"]
        }
        Update: {
          base_currency?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_priority?: boolean | null
          min_lot_size?: number | null
          name?: string | null
          pip_value?: number | null
          quote_currency?: string | null
          symbol?: string
          type?: Database["public"]["Enums"]["instrument_type"]
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          analysis_text: string | null
          asset_type: string | null
          change_24h: number | null
          chart_data: Json | null
          confidence: number
          created_at: string
          economic_impact: string | null
          fundamental_score: number | null
          id: string
          is_centralized: boolean | null
          last_price: number | null
          market_conditions: string[] | null
          market_context: Json | null
          pattern_detected: string | null
          pips: number
          price: number
          risk_reward_ratio: number | null
          sentiment_score: number | null
          status: string
          stop_loss: number
          symbol: string
          take_profits: number[] | null
          targets_hit: number[] | null
          technical_indicators: Json | null
          technical_score: number | null
          timestamp: string
          type: string
          updated_at: string
          user_id: string | null
          volume: number | null
        }
        Insert: {
          analysis_text?: string | null
          asset_type?: string | null
          change_24h?: number | null
          chart_data?: Json | null
          confidence: number
          created_at?: string
          economic_impact?: string | null
          fundamental_score?: number | null
          id?: string
          is_centralized?: boolean | null
          last_price?: number | null
          market_conditions?: string[] | null
          market_context?: Json | null
          pattern_detected?: string | null
          pips: number
          price: number
          risk_reward_ratio?: number | null
          sentiment_score?: number | null
          status?: string
          stop_loss: number
          symbol: string
          take_profits?: number[] | null
          targets_hit?: number[] | null
          technical_indicators?: Json | null
          technical_score?: number | null
          timestamp?: string
          type: string
          updated_at?: string
          user_id?: string | null
          volume?: number | null
        }
        Update: {
          analysis_text?: string | null
          asset_type?: string | null
          change_24h?: number | null
          chart_data?: Json | null
          confidence?: number
          created_at?: string
          economic_impact?: string | null
          fundamental_score?: number | null
          id?: string
          is_centralized?: boolean | null
          last_price?: number | null
          market_conditions?: string[] | null
          market_context?: Json | null
          pattern_detected?: string | null
          pips?: number
          price?: number
          risk_reward_ratio?: number | null
          sentiment_score?: number | null
          status?: string
          stop_loss?: number
          symbol?: string
          take_profits?: number[] | null
          targets_hit?: number[] | null
          technical_indicators?: Json | null
          technical_score?: number | null
          timestamp?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      build_mlm_hierarchy: {
        Args: { new_affiliate_id: string; parent_code?: string }
        Returns: undefined
      }
      cleanup_expired_verification_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_signals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      distribute_mlm_commission: {
        Args: {
          referral_user_id: string
          subscription_amount: number
          commission_type: string
          subscription_id?: string
        }
        Returns: undefined
      }
      generate_affiliate_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_type: "FOREX" | "CRYPTO" | "STOCKS"
      instrument_type: "FOREX"
      subscription_tier: "basic" | "pro" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      asset_type: ["FOREX", "CRYPTO", "STOCKS"],
      instrument_type: ["FOREX"],
      subscription_tier: ["basic", "pro", "enterprise"],
    },
  },
} as const
