// src/lib/database.types.ts
// Temporary hand-written types to unblock builds while Supabase typegen is unavailable.
// Keep this file stable: no circular/self references.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** ---- Tables: profiles ---- */
export type ProfilesRow = {
  id: string
  nickname: string | null
  is_admin: boolean | null
  points: number | null
  reward_streak: number | null
  created_at: string | null
}
export type ProfilesInsert = {
  id: string
  nickname?: string | null
  is_admin?: boolean | null
  points?: number | null
  reward_streak?: number | null
  created_at?: string | null
}
export type ProfilesUpdate = Partial<ProfilesInsert>

/** ---- Tables: news_posts ---- */
export type NewsPostsRow = {
  id: string
  title: string
  slug: string
  detail_markdown: string | null
  cover_image_url: string | null
  user_id: string | null
  created_at: string | null
  tags: string[] | null
  published_at: string | null
  is_published: boolean | null
}
export type NewsPostsInsert = {
  id?: string
  title: string
  slug: string
  detail_markdown?: string | null
  cover_image_url?: string | null
  user_id?: string | null
  created_at?: string | null
  tags?: string[] | null
  published_at?: string | null
  is_published?: boolean | null
}
export type NewsPostsUpdate = Partial<NewsPostsInsert>

/** ---- Tables: popular_keywords ---- */
export type PopularKeywordsRow = {
  id: string
  keyword: string
  created_at: string | null
  is_active: boolean | null
  sort_order: number | null
}
export type PopularKeywordsInsert = {
  id?: string
  keyword: string
  created_at?: string | null
  is_active?: boolean | null
  sort_order?: number | null
}
export type PopularKeywordsUpdate = Partial<PopularKeywordsInsert>

/** ---- Tables: teams ---- */
export type TeamsRow = {
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
export type TeamsInsert = {
  id?: string
  owner_id?: string | null
  name?: string | null
  purpose?: string | null
  image_url?: string | null
  tag1?: string | null
  tag2?: string | null
  created_at?: string | null
  is_active?: boolean | null
}
export type TeamsUpdate = Partial<TeamsInsert>

/** ---- Views ---- */
export type TeamsWithCountsRow = {
  id: string
  name: string | null
  purpose: string | null
  image_url: string | null
  tag1: string | null
  tag2: string | null
  participant_count: number | null
}

/** ---- RPC: claim_daily_reward ---- */
export type ClaimDailyRewardReturn = {
  claimed: boolean
  today: string
  streak: number
  awarded_points: number
  total_points: number
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' } // Vercel 로그에 12로 찍히는 환경 대응
  public: {
    Tables: {
      profiles: { Row: ProfilesRow; Insert: ProfilesInsert; Update: ProfilesUpdate; Relationships: [] }
      news_posts: { Row: NewsPostsRow; Insert: NewsPostsInsert; Update: NewsPostsUpdate; Relationships: [] }
      popular_keywords: { Row: PopularKeywordsRow; Insert: PopularKeywordsInsert; Update: PopularKeywordsUpdate; Relationships: [] }
      teams: { Row: TeamsRow; Insert: TeamsInsert; Update: TeamsUpdate; Relationships: [] }

      // 아래는 지금 빌드 목적상 최소한만 둠(필요하면 확장 가능)
      team_members: { Row: any; Insert: any; Update: any; Relationships: [] }
      team_activities: { Row: any; Insert: any; Update: any; Relationships: [] }
      activity_participants: { Row: any; Insert: any; Update: any; Relationships: [] }
      chat_logs: { Row: any; Insert: any; Update: any; Relationships: [] }
      daily_usage: { Row: any; Insert: any; Update: any; Relationships: [] }
      team_items: { Row: any; Insert: any; Update: any; Relationships: [] }
      team_item_participants: { Row: any; Insert: any; Update: any; Relationships: [] }
      team_pricing_rules: { Row: any; Insert: any; Update: any; Relationships: [] }
    }
    Views: {
      teams_with_counts: { Row: TeamsWithCountsRow; Relationships: [] }
    }
    Functions: {
      get_teams_with_counts: { Args: Record<string, never>; Returns: TeamsWithCountsRow[] }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_admin_user: { Args: { uid: string }; Returns: boolean }
      claim_daily_reward: { Args: Record<string, never>; Returns: ClaimDailyRewardReturn }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

/** Helpers used in the codebase */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export {}
