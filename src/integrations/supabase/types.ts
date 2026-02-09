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
      google_workspace_connections: {
        Row: {
          connected: boolean
          created_at: string
          last_connected_at: string | null
          oauth_state: string | null
          oauth_state_expires_at: string | null
          scopes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          created_at?: string
          last_connected_at?: string | null
          oauth_state?: string | null
          oauth_state_expires_at?: string | null
          scopes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected?: boolean
          created_at?: string
          last_connected_at?: string | null
          oauth_state?: string | null
          oauth_state_expires_at?: string | null
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_workspace_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      microsoft_workspace_connections: {
        Row: {
          connected: boolean
          created_at: string
          last_connected_at: string | null
          oauth_state: string | null
          oauth_state_expires_at: string | null
          scopes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          created_at?: string
          last_connected_at?: string | null
          oauth_state?: string | null
          oauth_state_expires_at?: string | null
          scopes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected?: boolean
          created_at?: string
          last_connected_at?: string | null
          oauth_state?: string | null
          oauth_state_expires_at?: string | null
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      microsoft_workspace_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slack_installations: {
        Row: {
          bot_token: string
          bot_user_id: string | null
          id: string
          installed_at: string
          installed_by_user_id: string | null
          team_id: string
          team_name: string | null
          updated_at: string
        }
        Insert: {
          bot_token: string
          bot_user_id?: string | null
          id?: string
          installed_at?: string
          installed_by_user_id?: string | null
          team_id: string
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          bot_token?: string
          bot_user_id?: string | null
          id?: string
          installed_at?: string
          installed_by_user_id?: string | null
          team_id?: string
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      slack_user_links: {
        Row: {
          id: string
          linked_at: string
          slack_team_id: string
          slack_user_id: string
          user_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          slack_team_id: string
          slack_user_id: string
          user_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          slack_team_id?: string
          slack_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_research: {
        Row: {
          created_at: string
          documents_analyzed: number | null
          emails_analyzed: number | null
          events_analyzed: number | null
          findings: Json
          id: string
          raw_data: Json
          research_summary: Json
          role: string | null
          sheets_analyzed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents_analyzed?: number | null
          emails_analyzed?: number | null
          events_analyzed?: number | null
          findings?: Json
          id?: string
          raw_data?: Json
          research_summary?: Json
          role?: string | null
          sheets_analyzed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents_analyzed?: number | null
          emails_analyzed?: number | null
          events_analyzed?: number | null
          findings?: Json
          id?: string
          raw_data?: Json
          research_summary?: Json
          role?: string | null
          sheets_analyzed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
