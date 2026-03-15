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
          created_at: string
          id: string
          linked_business_id: string | null
          name: string
          orb_colors: Json | null
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
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          linked_business_id?: string | null
          name: string
          orb_colors?: Json | null
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
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          linked_business_id?: string | null
          name?: string
          orb_colors?: Json | null
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
          referred_email: string
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          actions_granted?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email: string
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          actions_granted?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string
          referred_user_id?: string | null
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
          connected_at: string | null
          id: string
          metadata: Json | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          status?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
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
      [_ in never]: never
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
      complete_referral: {
        Args: { _referral_code: string; _referred_user_id: string }
        Returns: Json
      }
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
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      increment_actions_used: { Args: { _user_id: string }; Returns: Json }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
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
