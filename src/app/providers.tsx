'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type AuthUserState = {
  user: User | null
  loading: boolean
}

type ProviderValue = {
  supabase: SupabaseClient<Database>
  auth: AuthUserState
}

const Ctx = createContext<ProviderValue | null>(null)

function mustEnv(name: string) {
  const v = (process.env[name] || '').trim()
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export default function Providers({ children }: PropsWithChildren) {
  // ✅ 핵심: SupabaseClient<Database> 로 고정
  const supabase = useMemo(() => {
    const url = mustEnv('NEXT_PUBLIC_SUPABASE_URL')
    const anon = mustEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return createBrowserClient<Database>(url, anon)
  }, [])

  const [auth, setAuth] = useState<AuthUserState>({ user: null, loading: true })

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        const session: Session | null = data.session ?? null
        if (!mounted) return
        setAuth({ user: session?.user ?? null, loading: false })
      } catch {
        if (!mounted) return
        setAuth({ user: null, loading: false })
      }
    }

    void init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuth({ user: session?.user ?? null, loading: false })
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const value = useMemo<ProviderValue>(() => ({ supabase, auth }), [supabase, auth])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSupabase() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSupabase must be used within <Providers />')
  return v.supabase
}

export function useAuthUser() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuthUser must be used within <Providers />')
  return v.auth
}
