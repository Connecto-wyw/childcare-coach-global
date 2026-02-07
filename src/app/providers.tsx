// src/app/providers.tsx
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

// ✅ 핵심: client에서는 env를 "직접" 접근해야 Next가 치환함
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export function Providers({ children }: PropsWithChildren) {
  // ✅ env 누락 시 throw 금지 (앱 전체 크래시 방지)
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    const missing = !SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-[#f0f7fd] p-4">
          <div className="text-[15px] font-semibold text-[#0e0e0e]">Configuration error</div>
          <div className="mt-2 text-[13px] text-[#0e0e0e]">Missing env: {missing}</div>
          <div className="mt-2 text-[13px] text-[#b4b4b4]">
            Set this in Vercel Environment Variables (Production/Preview) and redeploy.
          </div>
        </div>
      </div>
    )
  }

  const supabase = useMemo(() => {
    return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON)
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

export default Providers

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
