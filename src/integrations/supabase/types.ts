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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_chat_sessions: {
        Row: {
          agent_name: string | null
          assistant_memory: string
          created_at: string
          goal_state: Json | null
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          agent_name?: string | null
          assistant_memory?: string
          created_at?: string
          goal_state?: Json | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          agent_name?: string | null
          assistant_memory?: string
          created_at?: string
          goal_state?: Json | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_chat_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_runs: {
        Row: {
          agent_id: string
          error: string | null
          finished_at: string | null
          id: string
          message: string | null
          output: Json | null
          started_at: string
          status: string
          step_label: string | null
          trigger_kind: string
          user_id: string
        }
        Insert: {
          agent_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          message?: string | null
          output?: Json | null
          started_at?: string
          status?: string
          step_label?: string | null
          trigger_kind?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          message?: string | null
          output?: Json | null
          started_at?: string
          status?: string
          step_label?: string | null
          trigger_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          created_at: string
          description: string | null
          execution_mode: string
          id: string
          last_run_at: string | null
          linked_business_id: string | null
          name: string
          required_integrations: Json
          run_count: number
          safety_can_do: Json
          safety_cannot_do: Json
          safety_escalation_path: string | null
          slack_bot_icon_emoji: string | null
          slack_bot_icon_url: string | null
          slack_bot_username: string | null
          slack_default_channel: string | null
          sop_output: string | null
          sop_steps: Json
          status: string
          supervisor_employee_id: string | null
          trigger_condition: string | null
          trigger_schedule: string | null
          trigger_source: string | null
          trigger_type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          execution_mode?: string
          id?: string
          last_run_at?: string | null
          linked_business_id?: string | null
          name: string
          required_integrations?: Json
          run_count?: number
          safety_can_do?: Json
          safety_cannot_do?: Json
          safety_escalation_path?: string | null
          slack_bot_icon_emoji?: string | null
          slack_bot_icon_url?: string | null
          slack_bot_username?: string | null
          slack_default_channel?: string | null
          sop_output?: string | null
          sop_steps?: Json
          status?: string
          supervisor_employee_id?: string | null
          trigger_condition?: string | null
          trigger_schedule?: string | null
          trigger_source?: string | null
          trigger_type?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          execution_mode?: string
          id?: string
          last_run_at?: string | null
          linked_business_id?: string | null
          name?: string
          required_integrations?: Json
          run_count?: number
          safety_can_do?: Json
          safety_cannot_do?: Json
          safety_escalation_path?: string | null
          slack_bot_icon_emoji?: string | null
          slack_bot_icon_url?: string | null
          slack_bot_username?: string | null
          slack_default_channel?: string | null
          sop_output?: string | null
          sop_steps?: Json
          status?: string
          supervisor_employee_id?: string | null
          trigger_condition?: string | null
          trigger_schedule?: string | null
          trigger_source?: string | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_linked_business_id_fkey"
            columns: ["linked_business_id"]
            isOneToOne: false
            referencedRelation: "user_business_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_supervisor_employee_id_fkey"
            columns: ["supervisor_employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_business_learning_events: {
        Row: {
          agent_surface: string
          assistant_response_excerpt: string
          business_id: string | null
          created_at: string
          dna_alignment_score: number
          employee_id: string | null
          id: string
          metadata: Json
          mode: string
          recommendation_type: string
          user_id: string
          user_message: string
          workspace_id: string | null
        }
        Insert: {
          agent_surface: string
          assistant_response_excerpt?: string
          business_id?: string | null
          created_at?: string
          dna_alignment_score?: number
          employee_id?: string | null
          id?: string
          metadata?: Json
          mode: string
          recommendation_type?: string
          user_id: string
          user_message?: string
          workspace_id?: string | null
        }
        Update: {
          agent_surface?: string
          assistant_response_excerpt?: string
          business_id?: string | null
          created_at?: string
          dna_alignment_score?: number
          employee_id?: string | null
          id?: string
          metadata?: Json
          mode?: string
          recommendation_type?: string
          user_id?: string
          user_message?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_employee_logs: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          message: string | null
          status: string
          step_label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          message?: string | null
          status?: string
          step_label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          message?: string | null
          status?: string
          step_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_employee_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_employees: {
        Row: {
          advises_on: Json
          created_at: string
          does_not_touch: Json
          domain_lens: string | null
          id: string
          linked_business_id: string | null
          name: string
          orb_colors: Json | null
          owns: Json
          role: string
          sop_definitions: Json | null
          sop_documentation: string | null
          sop_materials: Json | null
          sop_procedure: Json | null
          sop_purpose: string | null
          sop_responsibilities: Json | null
          sop_revision_history: Json | null
          sop_safety_notes: string | null
          sop_scope: string | null
          sop_title: string | null
          status: string
          triggers: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          advises_on?: Json
          created_at?: string
          does_not_touch?: Json
          domain_lens?: string | null
          id?: string
          linked_business_id?: string | null
          name: string
          orb_colors?: Json | null
          owns?: Json
          role: string
          sop_definitions?: Json | null
          sop_documentation?: string | null
          sop_materials?: Json | null
          sop_procedure?: Json | null
          sop_purpose?: string | null
          sop_responsibilities?: Json | null
          sop_revision_history?: Json | null
          sop_safety_notes?: string | null
          sop_scope?: string | null
          sop_title?: string | null
          status?: string
          triggers?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          advises_on?: Json
          created_at?: string
          does_not_touch?: Json
          domain_lens?: string | null
          id?: string
          linked_business_id?: string | null
          name?: string
          orb_colors?: Json | null
          owns?: Json
          role?: string
          sop_definitions?: Json | null
          sop_documentation?: string | null
          sop_materials?: Json | null
          sop_procedure?: Json | null
          sop_purpose?: string | null
          sop_responsibilities?: Json | null
          sop_revision_history?: Json | null
          sop_safety_notes?: string | null
          sop_scope?: string | null
          sop_title?: string | null
          status?: string
          triggers?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_employees_linked_business_id_fkey"
            columns: ["linked_business_id"]
            isOneToOne: false
            referencedRelation: "user_business_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_memory: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          source: string
          updated_at: string
          user_id: string
          value: string
          workspace_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          key: string
          source?: string
          updated_at?: string
          user_id: string
          value: string
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          source?: string
          updated_at?: string
          user_id?: string
          value?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_learning_state: {
        Row: {
          business_id: string
          category_weights: Json
          created_at: string
          id: string
          source_weights: Json
          tab_weights: Json
          theme_weights: Json
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          business_id: string
          category_weights?: Json
          created_at?: string
          id?: string
          source_weights?: Json
          tab_weights?: Json
          theme_weights?: Json
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          business_id?: string
          category_weights?: Json
          created_at?: string
          id?: string
          source_weights?: Json
          tab_weights?: Json
          theme_weights?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      dashboard_card_events: {
        Row: {
          business_id: string | null
          card_id: string
          category: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          priority: string | null
          source: string | null
          tab: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          business_id?: string | null
          card_id: string
          category?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          priority?: string | null
          source?: string | null
          tab: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          business_id?: string | null
          card_id?: string
          category?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          priority?: string | null
          source?: string | null
          tab?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      dashboard_card_notes: {
        Row: {
          author_email: string
          card_id: string
          color: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          author_email?: string
          card_id: string
          color?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          author_email?: string
          card_id?: string
          color?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      dashboard_objective_outcomes: {
        Row: {
          business_id: string | null
          created_at: string
          current_value: number | null
          delta_value: number | null
          id: string
          metadata: Json
          metric_name: string
          objective_id: string
          source: string | null
          target_value: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          current_value?: number | null
          delta_value?: number | null
          id?: string
          metadata?: Json
          metric_name: string
          objective_id: string
          source?: string | null
          target_value?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          current_value?: number | null
          delta_value?: number | null
          id?: string
          metadata?: Json
          metric_name?: string
          objective_id?: string
          source?: string | null
          target_value?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      dashboard_snapshots: {
        Row: {
          brand_id: string
          cards: Json
          created_at: string
          health_score: Json | null
          id: string
          opening_summary: string | null
          tab_cards: Json | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          brand_id: string
          cards?: Json
          created_at?: string
          health_score?: Json | null
          id?: string
          opening_summary?: string | null
          tab_cards?: Json | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          brand_id?: string
          cards?: Json
          created_at?: string
          health_score?: Json | null
          id?: string
          opening_summary?: string | null
          tab_cards?: Json | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      integration_requests: {
        Row: {
          created_at: string
          details: string | null
          id: string
          integration_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          integration_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          integration_name?: string
          user_id?: string
        }
        Relationships: []
      }
      long_task_checkpoints: {
        Row: {
          content: string
          continuation_index: number
          continuation_key: string
          created_at: string
          id: string
          metadata: Json
          run_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          continuation_index?: number
          continuation_key: string
          created_at?: string
          id?: string
          metadata?: Json
          run_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          continuation_index?: number
          continuation_key?: string
          created_at?: string
          id?: string
          metadata?: Json
          run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "long_task_checkpoints_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "long_task_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      long_task_runs: {
        Row: {
          business_id: string | null
          continuation_key: string
          created_at: string
          error: string | null
          id: string
          logs: Json
          phase: string
          progress: number
          result_excerpt: string | null
          status: string
          task_type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          business_id?: string | null
          continuation_key: string
          created_at?: string
          error?: string | null
          id?: string
          logs?: Json
          phase?: string
          progress?: number
          result_excerpt?: string | null
          status?: string
          task_type?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          business_id?: string | null
          continuation_key?: string
          created_at?: string
          error?: string | null
          id?: string
          logs?: Json
          phase?: string
          progress?: number
          result_excerpt?: string | null
          status?: string
          task_type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      platform_config: {
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
      referrals: {
        Row: {
          actions_granted: boolean
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_celebrated_at: string | null
          referred_email: string
          referred_user_id: string | null
          referrer_celebrated_at: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          actions_granted?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_celebrated_at?: string | null
          referred_email: string
          referred_user_id?: string | null
          referrer_celebrated_at?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          actions_granted?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_celebrated_at?: string | null
          referred_email?: string
          referred_user_id?: string | null
          referrer_celebrated_at?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      timewarp_chats: {
        Row: {
          ai_reply: string | null
          created_at: string | null
          id: string
          page_url: string | null
          user_id: string
          user_message: string | null
        }
        Insert: {
          ai_reply?: string | null
          created_at?: string | null
          id?: string
          page_url?: string | null
          user_id: string
          user_message?: string | null
        }
        Update: {
          ai_reply?: string | null
          created_at?: string | null
          id?: string
          page_url?: string | null
          user_id?: string
          user_message?: string | null
        }
        Relationships: []
      }
      user_business_data: {
        Row: {
          analyzed_content: string | null
          content: string | null
          created_at: string | null
          data_type: string
          file_path: string | null
          id: string
          is_analyzed: boolean | null
          metadata: Json | null
          source: string
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          analyzed_content?: string | null
          content?: string | null
          created_at?: string | null
          data_type: string
          file_path?: string | null
          id?: string
          is_analyzed?: boolean | null
          metadata?: Json | null
          source?: string
          title: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          analyzed_content?: string | null
          content?: string | null
          created_at?: string | null
          data_type?: string
          file_path?: string | null
          id?: string
          is_analyzed?: boolean | null
          metadata?: Json | null
          source?: string
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_business_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connections: {
        Row: {
          brand_id: string | null
          connected_at: string | null
          id: string
          metadata: Json | null
          provider: string
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          brand_id?: string | null
          connected_at?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          status?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          brand_id?: string | null
          connected_at?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "user_business_data"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          provider: string
          provider_email: string | null
          provider_user_id: string | null
          refresh_token: string | null
          scopes: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          provider: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          provider?: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_safety_settings: {
        Row: {
          created_at: string
          custom_guardrails: Json
          focus_enabled: boolean
          integrity_enabled: boolean
          moderation_categories: Json
          prompt_injection_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_guardrails?: Json
          focus_enabled?: boolean
          integrity_enabled?: boolean
          moderation_categories?: Json
          prompt_injection_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_guardrails?: Json
          focus_enabled?: boolean
          integrity_enabled?: boolean
          moderation_categories?: Json
          prompt_injection_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          actions: number
          actions_used: number
          billing_period: Database["public"]["Enums"]["billing_period"]
          bonus_actions: number
          created_at: string
          data_used_bytes: number
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: number
          actions_used?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          bonus_actions?: number
          created_at?: string
          data_used_bytes?: number
          id?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: number
          actions_used?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          bonus_actions?: number
          created_at?: string
          data_used_bytes?: number
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whiteboard_chat_history: {
        Row: {
          chat_type: string
          created_at: string
          id: string
          messages: Json
          node_id: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          chat_type: string
          created_at?: string
          id?: string
          messages?: Json
          node_id: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          chat_type?: string
          created_at?: string
          id?: string
          messages?: Json
          node_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_chat_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_subscriptions: {
        Row: {
          actions_used: number
          billing_period: Database["public"]["Enums"]["billing_period"]
          bonus_actions: number
          created_at: string
          data_used_bytes: number
          id: string
          migrated_from_user: boolean
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          source_user_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actions_used?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          bonus_actions?: number
          created_at?: string
          data_used_bytes?: number
          id?: string
          migrated_from_user?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          source_user_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actions_used?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          bonus_actions?: number
          created_at?: string
          data_used_bytes?: number
          id?: string
          migrated_from_user?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          source_user_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      workspace_memory_aggregate: {
        Row: {
          category: string | null
          key: string | null
          source: string | null
          updated_at: string | null
          user_id: string | null
          value: string | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          key?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          key?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_workspace_invitation: { Args: { _token: string }; Returns: Json }
      can_access_user_data: {
        Args: { _data_owner: string; _requesting_user: string }
        Returns: boolean
      }
      can_edit_user_data: {
        Args: { _data_owner: string; _requesting_user: string }
        Returns: boolean
      }
      check_storage_limit: {
        Args: { _additional_bytes: number; _user_id: string }
        Returns: Json
      }
      check_workspace_storage_limit: {
        Args: { _additional_bytes: number; _workspace_id: string }
        Returns: Json
      }
      claim_legacy_plan_into_workspace: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      complete_referral: {
        Args: { _referral_code: string; _referred_user_id: string }
        Returns: Json
      }
      create_workspace: { Args: { _name: string }; Returns: string }
      decrement_action: { Args: { user_id: string }; Returns: boolean }
      decrement_og_spots: { Args: never; Returns: undefined }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
      get_user_workspaces: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          member_count: number
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
          workspace_name: string
        }[]
      }
      get_workspace_members: {
        Args: { _workspace_id: string }
        Returns: {
          email: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
        }[]
      }
      get_workspace_plan: {
        Args: { _workspace_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
      has_pending_plan_migration: { Args: never; Returns: Json }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      increment_actions_used:
        | { Args: { _user_id: string }; Returns: Json }
        | { Args: { _cost_usd?: number; _user_id: string }; Returns: Json }
      increment_workspace_actions:
        | { Args: { _workspace_id: string }; Returns: Json }
        | { Args: { _cost_usd?: number; _workspace_id: string }; Returns: Json }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      recalculate_data_usage: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      billing_period: "monthly" | "quarterly" | "annually"
      subscription_plan: "co_founder" | "aristotle" | "timewarp_og"
      subscription_status: "active" | "cancelled" | "past_due" | "trialing"
      workspace_role: "owner" | "admin" | "editor"
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
      billing_period: ["monthly", "quarterly", "annually"],
      subscription_plan: ["co_founder", "aristotle", "timewarp_og"],
      subscription_status: ["active", "cancelled", "past_due", "trialing"],
      workspace_role: ["owner", "admin", "editor"],
    },
  },
} as const
