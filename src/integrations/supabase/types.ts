export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string
          full_name: string | null
          id: string
          last_name: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          full_name?: string | null
          id: string
          last_name?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          last_name?: string
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
          id: string
          is_centralized: boolean | null
          last_price: number | null
          market_conditions: string[] | null
          pips: number
          price: number
          status: string
          stop_loss: number
          symbol: string
          take_profits: number[] | null
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
          id?: string
          is_centralized?: boolean | null
          last_price?: number | null
          market_conditions?: string[] | null
          pips: number
          price: number
          status?: string
          stop_loss: number
          symbol: string
          take_profits?: number[] | null
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
          id?: string
          is_centralized?: boolean | null
          last_price?: number | null
          market_conditions?: string[] | null
          pips?: number
          price?: number
          status?: string
          stop_loss?: number
          symbol?: string
          take_profits?: number[] | null
          timestamp?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          volume?: number | null
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
      cleanup_old_signals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
