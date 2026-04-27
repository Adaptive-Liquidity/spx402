export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_events: {
        Row: {
          amount_sol: number
          amount_token: number
          created_at: string
          id: string
          mint: string
          occurred_at: string
          parser_version: string
          raw: Json
          severity: string
          signature: string
          slot: number | null
          type: string
        }
        Insert: {
          amount_sol?: number
          amount_token?: number
          created_at?: string
          id?: string
          mint: string
          occurred_at?: string
          parser_version?: string
          raw?: Json
          severity?: string
          signature: string
          slot?: number | null
          type: string
        }
        Update: {
          amount_sol?: number
          amount_token?: number
          created_at?: string
          id?: string
          mint?: string
          occurred_at?: string
          parser_version?: string
          raw?: Json
          severity?: string
          signature?: string
          slot?: number | null
          type?: string
        }
        Relationships: []
      }
      agent_score_snapshots: {
        Row: {
          confidence_model_version: string
          confidence_score: number
          grade: string | null
          id: string
          methodology_version: string
          mint: string
          score: number | null
          taken_at: string
        }
        Insert: {
          confidence_model_version?: string
          confidence_score?: number
          grade?: string | null
          id?: string
          methodology_version?: string
          mint: string
          score?: number | null
          taken_at?: string
        }
        Update: {
          confidence_model_version?: string
          confidence_score?: number
          grade?: string | null
          id?: string
          methodology_version?: string
          mint?: string
          score?: number | null
          taken_at?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          burn_confirmation_rate: number
          buyback_bps: number
          buyback_execution_rate: number
          category: string
          confidence: string
          confidence_breakdown: Json
          confidence_model_version: string
          confidence_score: number
          config_last_changed_label: string | null
          core_asset: string | null
          created_at: string
          deposit_address: string | null
          events: Json
          executor_wallet: string | null
          failed_windows: number
          flag_reason: string | null
          flagged: boolean
          flagged_at: string | null
          grade: string
          identifier_kind: string
          last_burn_label: string | null
          last_buyback_label: string | null
          last_indexed_seconds: number
          metadata_uri: string | null
          methodology_version: string
          mint: string
          name: string
          operator_verified: boolean
          operator_wallet: string | null
          parser_version: string
          price_series: Json
          score: number | null
          score_breakdown: Json
          scored_at: string | null
          status: string
          symbol: string
          tagline: string | null
          total_burned_tokens: number
          total_burns_count: number
          total_buyback_sol: number
          total_buybacks_count: number
          total_deposited_sol: number
          total_deposits_count: number
          updated_at: string
          verdict: string | null
        }
        Insert: {
          burn_confirmation_rate?: number
          buyback_bps?: number
          buyback_execution_rate?: number
          category?: string
          confidence?: string
          confidence_breakdown?: Json
          confidence_model_version?: string
          confidence_score?: number
          config_last_changed_label?: string | null
          core_asset?: string | null
          created_at?: string
          deposit_address?: string | null
          events?: Json
          executor_wallet?: string | null
          failed_windows?: number
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          grade: string
          identifier_kind?: string
          last_burn_label?: string | null
          last_buyback_label?: string | null
          last_indexed_seconds?: number
          metadata_uri?: string | null
          methodology_version?: string
          mint: string
          name: string
          operator_verified?: boolean
          operator_wallet?: string | null
          parser_version?: string
          price_series?: Json
          score?: number | null
          score_breakdown?: Json
          scored_at?: string | null
          status?: string
          symbol: string
          tagline?: string | null
          total_burned_tokens?: number
          total_burns_count?: number
          total_buyback_sol?: number
          total_buybacks_count?: number
          total_deposited_sol?: number
          total_deposits_count?: number
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          burn_confirmation_rate?: number
          buyback_bps?: number
          buyback_execution_rate?: number
          category?: string
          confidence?: string
          confidence_breakdown?: Json
          confidence_model_version?: string
          confidence_score?: number
          config_last_changed_label?: string | null
          core_asset?: string | null
          created_at?: string
          deposit_address?: string | null
          events?: Json
          executor_wallet?: string | null
          failed_windows?: number
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          grade?: string
          identifier_kind?: string
          last_burn_label?: string | null
          last_buyback_label?: string | null
          last_indexed_seconds?: number
          metadata_uri?: string | null
          methodology_version?: string
          mint?: string
          name?: string
          operator_verified?: boolean
          operator_wallet?: string | null
          parser_version?: string
          price_series?: Json
          score?: number | null
          score_breakdown?: Json
          scored_at?: string | null
          status?: string
          symbol?: string
          tagline?: string | null
          total_burned_tokens?: number
          total_burns_count?: number
          total_buyback_sol?: number
          total_buybacks_count?: number
          total_deposited_sol?: number
          total_deposits_count?: number
          updated_at?: string
          verdict?: string | null
        }
        Relationships: []
      }
      alert_subscriptions: {
        Row: {
          channel: string
          created_at: string
          event_burn: boolean
          event_buyback: boolean
          event_config_change: boolean
          event_deposit: boolean
          event_failed_window: boolean
          event_score_drop: boolean
          id: string
          min_sol_threshold: number
          mint: string
          paused: boolean
          score_drop_threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          event_burn?: boolean
          event_buyback?: boolean
          event_config_change?: boolean
          event_deposit?: boolean
          event_failed_window?: boolean
          event_score_drop?: boolean
          id?: string
          min_sol_threshold?: number
          mint: string
          paused?: boolean
          score_drop_threshold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_burn?: boolean
          event_buyback?: boolean
          event_config_change?: boolean
          event_deposit?: boolean
          event_failed_window?: boolean
          event_score_drop?: boolean
          id?: string
          min_sol_threshold?: number
          mint?: string
          paused?: boolean
          score_drop_threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      candidate_agents: {
        Row: {
          category: string
          check_attempts: number
          core_asset: string | null
          created_at: string
          discovered_via: string
          executor_wallet: string | null
          id: string
          identifier_kind: string
          last_checked_at: string | null
          mint: string
          notes: string | null
          rejection_reason: string | null
          signals: Json
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          check_attempts?: number
          core_asset?: string | null
          created_at?: string
          discovered_via?: string
          executor_wallet?: string | null
          id?: string
          identifier_kind?: string
          last_checked_at?: string | null
          mint: string
          notes?: string | null
          rejection_reason?: string | null
          signals?: Json
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          check_attempts?: number
          core_asset?: string | null
          created_at?: string
          discovered_via?: string
          executor_wallet?: string | null
          id?: string
          identifier_kind?: string
          last_checked_at?: string | null
          mint?: string
          notes?: string | null
          rejection_reason?: string | null
          signals?: Json
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      changelog: {
        Row: {
          created_at: string
          id: string
          items: string[]
          released_on: string
          type: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: string[]
          released_on: string
          type: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: string[]
          released_on?: string
          type?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      indexer_runs: {
        Row: {
          duration_ms: number
          id: string
          notes: string | null
          ok: boolean
          ran_at: string
          worker: string
        }
        Insert: {
          duration_ms?: number
          id?: string
          notes?: string | null
          ok?: boolean
          ran_at?: string
          worker: string
        }
        Update: {
          duration_ms?: number
          id?: string
          notes?: string | null
          ok?: boolean
          ran_at?: string
          worker?: string
        }
        Relationships: []
      }
      operator_challenges: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          mint: string
          nonce: string
          signature: string | null
          signed_at: string | null
          user_id: string
          wallet: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          mint: string
          nonce: string
          signature?: string | null
          signed_at?: string | null
          user_id: string
          wallet: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          mint?: string
          nonce?: string
          signature?: string | null
          signed_at?: string | null
          user_id?: string
          wallet?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          operator_wallet: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          operator_wallet?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          operator_wallet?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          label: string | null
          mint: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          mint: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          mint?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_profile: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          operator_wallet: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          operator_wallet?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          operator_wallet?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      enqueue_candidate_agent: { Args: { p_mint: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
