// src/lib/database.types.ts
// Temporary local types to unblock builds when Supabase typegen is unavailable.
// Once your Supabase project is healthy again, regenerate and replace this file.

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
      profiles: {
        Row: {
          id: string
          nickname: string | null
          is_admin: boolean | null
          points: number | null
          reward_streak: number | null
          created_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }

      news_posts: {
        Row: {
          id: string
          title: string
          slug: string
          created_at: string | null
          cover_image_url: string | null
          detail_markdown: string | null
          tags: string[] | null
          published_at: string | null
          is_published: boolean | null
        }
        Insert: Partial<Database['public']['Tables']['news_posts']['Row']> & { title: string; slug: string }
        Update: Partial<Database['public']['Tables']['news_posts']['Row']>
      }

      popular_keywords: {
        Row: {
          id: string
          keyword: string
          created_at: string | null
          is_active: boolean | null
          sort_order: number | null
        }
        Insert: Partial<Database['public']['Tables']['popular_keywords']['Row']> & { keyword: string }
        Update: Partial<Database['public']['Tables']['popular_keywords']['Row']>
      }

      teams: {
        Row: {
          id: string
          owner_id: string | null
          name: string | null
          purpose: string | null
          image_url: string | null
          tag1: string | null
          tag2: string | null
          created_at: string | null
          is_active: boolean | null
        }
        Insert: Partial<Database['public']['Tables']['teams']['Row']>
        Update: Partial<Database['public']['Tables']['teams']['Row']>
      }

      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          nickname: string | null
          created_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['team_members']['Row']> & { team_id: string; user_id: string }
        Update: Partial<Database['public']['Tables']['team_members']['Row']>
      }

      team_activities: {
        Row: {
          id: string
          team_id: string
          title: string | null
          description: string | null
          image_url: string | null
          created_at: string | null
          is_active: boolean | null
        }
        Insert: Partial<Database['public']['Tables']['team_activities']['Row']> & { team_id: string }
        Update: Partial<Database['public']['Tables']['team_activities']['Row']>
      }

      activity_participants: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          nickname: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['activity_participants']['Row']> & {
          activity_id: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['activity_participants']['Row']>
      }

      chat_logs: {
        Row: {
          id: string
          user_id: string
          question: string | null
          answer: string | null
          created_at: string | null
          // add fields as needed
        }
        Insert: Partial<Database['public']['Tables']['chat_logs']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['chat_logs']['Row']>
      }

      daily_usage: {
        Row: {
          id: string
          user_id: string
          used_date: string // YYYY-MM-DD
          question_count: number | null
          created_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['daily_usage']['Row']> & { user_id: string; used_date: string }
        Update: Partial<Database['public']['Tables']['daily_usage']['Row']>
      }

      team_items: {
        Row: {
          id: string
          team_id: string
          title: string | null
          created_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['team_items']['Row']> & { team_id: string }
        Update: Partial<Database['public']['Tables']['team_items']['Row']>
      }

      team_item_participants: {
        Row: {
          id: string
          team_item_id: string
          user_id: string
          created_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['team_item_participants']['Row']> & {
          team_item_id: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['team_item_participants']['Row']>
      }

      team_pricing_rules: {
        Row: {
          id: string
          team_id: string
          created_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['team_pricing_rules']['Row']> & { team_id: string }
        Update: Partial<Database['public']['Tables']['team_pricing_rules']['Row']>
      }
    }

    Views: {
      teams_with_counts: {
        Row: {
          id: string
          name: string | null
          purpose: string | null
          image_url: string | null
          tag1: string | null
          tag2: string | null
          participant_count: number | null
        }
      }
    }

    Functions: {
      // Keep these broad so TS doesn't block builds while DB is unstable.
      get_teams_with_counts: {
        Args: Record<string, never>
        Returns: Database['public']['Views']['teams_with_counts']['Row'][]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_admin_user: { Args: { uid: string }; Returns: boolean }

      claim_daily_reward: {
        Args: Record<string, never>
        Returns: {
          claimed: boolean
          today: string
          streak: number
          awarded_points: number
          total_points: number
        }
      }
    }

    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience helpers used across the codebase.
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']

// Safety pin: force module mode even if tooling/encoding gets weird.
export {}
