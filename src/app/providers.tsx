// src/app/providers.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

type SupabaseClient = ReturnType<typeof createBrowserClient>

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

export function Providers({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // ✅ supabase client는 반드시 "한 번만" 생성되게 (useState initializer)
  const [supabase] = useState(() => createBrowserClient(supabaseUrl, supabaseAnonKey))

  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return

      if (error) {
        // 여기서 console 찍어두면 auth 문제 추적이 쉬움
        console.warn('[auth.getSession] error:', error.message)
      }

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

  const value: Ctx = { supabase, user, session, loading }

  return <SupabaseCtx.Provider value={value}>{children}</SupabaseCtx.Provider>
}
