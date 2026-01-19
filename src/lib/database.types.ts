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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_participants: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          nickname: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          nickname?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          nickname?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "team_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_logs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          lang: string | null
          model: string | null
          question: string
          user_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          lang?: string | null
          model?: string | null
          question: string
          user_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          lang?: string | null
          model?: string | null
          question?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage: {
        Row: {
          id: string
          q_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          id?: string
          q_count?: number
          usage_date: string
          user_id: string
        }
        Update: {
          id?: string
          q_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          slug: string
          title: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          slug: string
          title: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          slug?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      popular_keywords: {
        Row: {
          created_at: string
          id: string
          keyword: string
          order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean
          provider: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean
          provider?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          provider?: string | null
        }
        Relationships: []
      }
      team_activities: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          starts_at: string | null
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          team_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_item_participants: {
        Row: {
          created_at: string
          id: string
          team_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_item_participants_team_item_id_fkey"
            columns: ["team_item_id"]
            isOneToOne: false
            referencedRelation: "team_items"
            referencedColumns: ["id"]
          },
        ]
      }
      team_items: {
        Row: {
          base_price: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          detail_markdown: string | null
          discount_step_every: number
          discount_step_percent: number
          gallery_urls: string[] | null
          id: string
          is_active: boolean
          max_discount_percent: number
          min_price: number
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          detail_markdown?: string | null
          discount_step_every?: number
          discount_step_percent?: number
          gallery_urls?: string[] | null
          id?: string
          is_active?: boolean
          max_discount_percent?: number
          min_price?: number
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          detail_markdown?: string | null
          discount_step_every?: number
          discount_step_percent?: number
          gallery_urls?: string[] | null
          id?: string
          is_active?: boolean
          max_discount_percent?: number
          min_price?: number
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          owner_id: string
          purpose: string | null
          region: string | null
          tag1: string | null
          tag2: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          owner_id: string
          purpose?: string | null
          region?: string | null
          tag1?: string | null
          tag2?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          owner_id?: string
          purpose?: string | null
          region?: string | null
          tag1?: string | null
          tag2?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      teams_with_counts: {
        Row: {
          created_at: string | null
          id: string | null
          image_url: string | null
          name: string | null
          owner_id: string | null
          participant_count: number | null
          purpose: string | null
          tag1: string | null
          tag2: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_teams_with_counts: {
        Args: never
        Returns: {
          created_at: string
          id: string
          image_url: string
          name: string
          participant_count: number
          purpose: string
          tag1: string
          tag2: string
        }[]
      }
      is_admin: { Args: { p_uid?: string }; Returns: boolean }
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
