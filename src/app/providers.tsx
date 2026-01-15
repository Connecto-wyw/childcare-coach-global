// src/app/providers.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

type Ctx = {
  supabase: SupabaseClient
  user: User | null
  session: Session | null
  loading: boolean
}

const SupabaseCtx = createContext<Ctx | null>(null)

export function useSupabase() {
  const ctx = useContext(SupabaseCtx)
  if (!ctx) throw new Error('useSupabase must be used within Providers')
  return ctx.supabase
}

export function useAuthUser() {
  const ctx = useContext(SupabaseCtx)
  if (!ctx) throw new Error('useAuthUser must be used within Providers')
  return { user: ctx.user, session: ctx.session, loading: ctx.loading }
}

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

function getSiteOrigin() {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envSite) return stripTrailingSlash(envSite)
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export function Providers({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // ✅ 단일 인스턴스 (중요)
  const [supabase] = useState(() =>
    createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  )

  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return

      if (error) console.warn('[auth.getSession] error:', error.message)

      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  // (선택) redirectTo 생성 함수가 필요한 곳에서 쓰려고 하면 여기서도 뽑아 쓸 수 있음
  // const siteOrigin = getSiteOrigin()

  const value: Ctx = { supabase, user, session, loading }
  return <SupabaseCtx.Provider value={value}>{children}</SupabaseCtx.Provider>
}
