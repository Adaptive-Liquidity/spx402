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
      aeon_receipts: {
        Row: {
          created_at: string
          id: string
          mint: string
          occurred_at: string
          payload: Json
          prev_hash: string | null
          receipt_address: string | null
          receipt_hash: string
          sequence: number
          signature: string
          slot: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          mint: string
          occurred_at?: string
          payload?: Json
          prev_hash?: string | null
          receipt_address?: string | null
          receipt_hash: string
          sequence?: number
          signature: string
          slot?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          mint?: string
          occurred_at?: string
          payload?: Json
          prev_hash?: string | null
          receipt_address?: string | null
          receipt_hash?: string
          sequence?: number
          signature?: string
          slot?: number | null
        }
        Relationships: []
      }
      agent_events: {
        Row: {
          amount_sol: number
          amount_token: number
          chain: string
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
          chain?: string
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
          chain?: string
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
          active_bond_amount: number
          aeon_cri_address: string | null
          burn_confirmation_rate: number
          buyback_bps: number
          buyback_execution_rate: number
          category: string
          chain: string
          confidence: string
          confidence_breakdown: Json
          confidence_model_version: string
          confidence_score: number
          config_last_changed_label: string | null
          core_asset: string | null
          created_at: string
          deposit_address: string | null
          escrow_success_rate: number
          events: Json
          executor_wallet: string | null
          failed_windows: number
          flag_reason: string | null
          flagged: boolean
          flagged_at: string | null
          grade: string
          identifier_kind: string
          identity_owner: string | null
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
          total_escrows_completed: number
          total_escrows_failed: number
          total_slashed_usd: number
          updated_at: string
          verdict: string | null
        }
        Insert: {
          active_bond_amount?: number
          aeon_cri_address?: string | null
          burn_confirmation_rate?: number
          buyback_bps?: number
          buyback_execution_rate?: number
          category?: string
          chain?: string
          confidence?: string
          confidence_breakdown?: Json
          confidence_model_version?: string
          confidence_score?: number
          config_last_changed_label?: string | null
          core_asset?: string | null
          created_at?: string
          deposit_address?: string | null
          escrow_success_rate?: number
          events?: Json
          executor_wallet?: string | null
          failed_windows?: number
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          grade: string
          identifier_kind?: string
          identity_owner?: string | null
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
          total_escrows_completed?: number
          total_escrows_failed?: number
          total_slashed_usd?: number
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          active_bond_amount?: number
          aeon_cri_address?: string | null
          burn_confirmation_rate?: number
          buyback_bps?: number
          buyback_execution_rate?: number
          category?: string
          chain?: string
          confidence?: string
          confidence_breakdown?: Json
          confidence_model_version?: string
          confidence_score?: number
          config_last_changed_label?: string | null
          core_asset?: string | null
          created_at?: string
          deposit_address?: string | null
          escrow_success_rate?: number
          events?: Json
          executor_wallet?: string | null
          failed_windows?: number
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          grade?: string
          identifier_kind?: string
          identity_owner?: string | null
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
          total_escrows_completed?: number
          total_escrows_failed?: number
          total_slashed_usd?: number
          updated_at?: string
          verdict?: string | null
        }
        Relationships: []
      }
      alert_channels: {
        Row: {
          created_at: string
          digest: string
          id: string
          kind: string
          label: string
          last_delivery_at: string | null
          last_error: string | null
          paused: boolean
          secret: string | null
          target: string
          user_id: string
          verified: boolean
          verify_token: string | null
        }
        Insert: {
          created_at?: string
          digest?: string
          id?: string
          kind: string
          label?: string
          last_delivery_at?: string | null
          last_error?: string | null
          paused?: boolean
          secret?: string | null
          target: string
          user_id: string
          verified?: boolean
          verify_token?: string | null
        }
        Update: {
          created_at?: string
          digest?: string
          id?: string
          kind?: string
          label?: string
          last_delivery_at?: string | null
          last_error?: string | null
          paused?: boolean
          secret?: string | null
          target?: string
          user_id?: string
          verified?: boolean
          verify_token?: string | null
        }
        Relationships: []
      }
      alert_deliveries: {
        Row: {
          attempt: number
          channel_id: string | null
          created_at: string
          error: string | null
          event_id: string | null
          event_type: string | null
          http_status: number | null
          id: string
          mint: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          attempt?: number
          channel_id?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          mint?: string | null
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          attempt?: number
          channel_id?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          mint?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "alert_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_dispatch_state: {
        Row: {
          id: number
          last_event_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          last_event_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          last_event_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alert_subscriptions: {
        Row: {
          channel: string
          created_at: string
          event_bond_deposited: boolean
          event_bond_slashed: boolean
          event_burn: boolean
          event_buyback: boolean
          event_config_change: boolean
          event_deposit: boolean
          event_escrow_canceled: boolean
          event_escrow_created: boolean
          event_escrow_released: boolean
          event_failed_window: boolean
          event_receipt_created: boolean
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
          event_bond_deposited?: boolean
          event_bond_slashed?: boolean
          event_burn?: boolean
          event_buyback?: boolean
          event_config_change?: boolean
          event_deposit?: boolean
          event_escrow_canceled?: boolean
          event_escrow_created?: boolean
          event_escrow_released?: boolean
          event_failed_window?: boolean
          event_receipt_created?: boolean
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
          event_bond_deposited?: boolean
          event_bond_slashed?: boolean
          event_burn?: boolean
          event_buyback?: boolean
          event_config_change?: boolean
          event_deposit?: boolean
          event_escrow_canceled?: boolean
          event_escrow_created?: boolean
          event_escrow_released?: boolean
          event_failed_window?: boolean
          event_receipt_created?: boolean
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
      api_keys: {
        Row: {
          created_at: string
          daily_limit: number
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          metadata: Json
          name: string
          revoked_at: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix?: string
          last_used_at?: string | null
          metadata?: Json
          name?: string
          revoked_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          metadata?: Json
          name?: string
          revoked_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          payer: string | null
          status: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          payer?: string | null
          status?: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          payer?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_agents: {
        Row: {
          category: string
          chain: string
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
          chain?: string
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
          chain?: string
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
      facilitators: {
        Row: {
          active: boolean
          address: string
          chain: string
          first_seen_at: string
          fixture_id: string | null
          id: string
          name: string
          scheme: string
          source_url: string | null
        }
        Insert: {
          active?: boolean
          address: string
          chain: string
          first_seen_at?: string
          fixture_id?: string | null
          id: string
          name: string
          scheme?: string
          source_url?: string | null
        }
        Update: {
          active?: boolean
          address?: string
          chain?: string
          first_seen_at?: string
          fixture_id?: string | null
          id?: string
          name?: string
          scheme?: string
          source_url?: string | null
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
      indexer_state: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
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
      probe_run: {
        Row: {
          chain: string
          challenge_json: Json | null
          challenge_valid: boolean | null
          delivered: boolean | null
          http_status: number | null
          id: string
          notes: string | null
          outcome: string
          paid_amount_usd: number | null
          probe_kind: string
          prober_wallet: string | null
          ran_at: string
          service_id: string
          settle_ms: number | null
          tx_signature: string | null
          verify_ms: number | null
        }
        Insert: {
          chain?: string
          challenge_json?: Json | null
          challenge_valid?: boolean | null
          delivered?: boolean | null
          http_status?: number | null
          id?: string
          notes?: string | null
          outcome: string
          paid_amount_usd?: number | null
          probe_kind: string
          prober_wallet?: string | null
          ran_at?: string
          service_id: string
          settle_ms?: number | null
          tx_signature?: string | null
          verify_ms?: number | null
        }
        Update: {
          chain?: string
          challenge_json?: Json | null
          challenge_valid?: boolean | null
          delivered?: boolean | null
          http_status?: number | null
          id?: string
          notes?: string | null
          outcome?: string
          paid_amount_usd?: number | null
          probe_kind?: string
          prober_wallet?: string | null
          ran_at?: string
          service_id?: string
          settle_ms?: number | null
          tx_signature?: string | null
          verify_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "probe_run_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "x402_service"
            referencedColumns: ["id"]
          },
        ]
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
      x402_payments: {
        Row: {
          amount: number
          chain: string
          endpoint: string
          pay_to: string
          payer: string | null
          resource: string | null
          tx_hash: string
          verified_at: string
        }
        Insert: {
          amount: number
          chain?: string
          endpoint: string
          pay_to: string
          payer?: string | null
          resource?: string | null
          tx_hash: string
          verified_at?: string
        }
        Update: {
          amount?: number
          chain?: string
          endpoint?: string
          pay_to?: string
          payer?: string | null
          resource?: string | null
          tx_hash?: string
          verified_at?: string
        }
        Relationships: []
      }
      x402_service: {
        Row: {
          active: boolean
          advertised_amount_usd: number | null
          advertised_asset: string | null
          chain: string
          discovered_via: string
          facilitator: string | null
          first_seen_at: string
          id: string
          last_challenge_probe_at: string | null
          last_probe_at: string | null
          last_settlement_probe_at: string | null
          pay_to: string | null
          probe_tier: string
          slug: string
          url: string | null
        }
        Insert: {
          active?: boolean
          advertised_amount_usd?: number | null
          advertised_asset?: string | null
          chain?: string
          discovered_via: string
          facilitator?: string | null
          first_seen_at?: string
          id?: string
          last_challenge_probe_at?: string | null
          last_probe_at?: string | null
          last_settlement_probe_at?: string | null
          pay_to?: string | null
          probe_tier?: string
          slug: string
          url?: string | null
        }
        Update: {
          active?: boolean
          advertised_amount_usd?: number | null
          advertised_asset?: string | null
          chain?: string
          discovered_via?: string
          facilitator?: string | null
          first_seen_at?: string
          id?: string
          last_challenge_probe_at?: string | null
          last_probe_at?: string | null
          last_settlement_probe_at?: string | null
          pay_to?: string | null
          probe_tier?: string
          slug?: string
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      candidate_agents_public: {
        Row: {
          category: string | null
          check_attempts: number | null
          created_at: string | null
          discovered_via: string | null
          identifier_kind: string | null
          last_checked_at: string | null
          mint: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          check_attempts?: number | null
          created_at?: string | null
          discovered_via?: string | null
          identifier_kind?: string | null
          last_checked_at?: string | null
          mint?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          check_attempts?: number | null
          created_at?: string | null
          discovered_via?: string | null
          identifier_kind?: string | null
          last_checked_at?: string | null
          mint?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      indexer_runs_public: {
        Row: {
          duration_ms: number | null
          id: string | null
          ok: boolean | null
          ran_at: string | null
          worker: string | null
        }
        Insert: {
          duration_ms?: number | null
          id?: string | null
          ok?: boolean | null
          ran_at?: string | null
          worker?: string | null
        }
        Update: {
          duration_ms?: number | null
          id?: string | null
          ok?: boolean | null
          ran_at?: string | null
          worker?: string | null
        }
        Relationships: []
      }
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
      get_api_key_usage: {
        Args: { p_key_id: string }
        Returns: {
          total_calls: number
          used_this_month: number
          used_today: number
        }[]
      }
      verify_cron_bearer: { Args: { p_token: string }; Returns: boolean }
      x402_service_base_slug: {
        Args: { p_id: string; p_pay_to: string; p_url: string }
        Returns: string
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
