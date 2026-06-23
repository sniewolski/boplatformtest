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
      content_review_assets: {
        Row: {
          body_text: string | null
          category: string
          created_at: string
          id: string
          input_type: string
          owner_id: string
          review_status: string
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body_text?: string | null
          category: string
          created_at?: string
          id?: string
          input_type: string
          owner_id: string
          review_status?: string
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body_text?: string | null
          category?: string
          created_at?: string
          id?: string
          input_type?: string
          owner_id?: string
          review_status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_review_notes: {
        Row: {
          asset_id: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          owner_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          owner_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_review_notes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_review_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_settings: {
        Row: {
          currency: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          currency?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          currency?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      respondent_sessions: {
        Row: {
          completed_at: string | null
          consent: Json | null
          created_at: string
          expires_at: string | null
          id: string
          owner_id: string
          payload: Json
          respondent_email: string | null
          respondent_name: string | null
          result: Json | null
          status: string
          token: string
          tool_key: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          consent?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id: string
          payload?: Json
          respondent_email?: string | null
          respondent_name?: string | null
          result?: Json | null
          status?: string
          token: string
          tool_key: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          consent?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id?: string
          payload?: Json
          respondent_email?: string | null
          respondent_name?: string | null
          result?: Json | null
          status?: string
          token?: string
          tool_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      selling_systems_audit_conversion: {
        Row: {
          draft_answers: Json | null
          has_unsubmitted_changes: boolean
          owner_id: string
          submitted_answers: Json | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          draft_answers?: Json | null
          has_unsubmitted_changes?: boolean
          owner_id: string
          submitted_answers?: Json | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          draft_answers?: Json | null
          has_unsubmitted_changes?: boolean
          owner_id?: string
          submitted_answers?: Json | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin"
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
      app_role: ["owner", "admin"],
    },
  },
} as const
