// src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      news_posts: {
        Row: {
          id: string
          slug: string
          title: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content?: string
          created_at?: string
        }
      },
      logs: {
        Row: {
          id: string
          question: string
          answer: string
          session_id: string
          created_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          session_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          session_id?: string
          created_at?: string
        }
      }
    }
  }
}
