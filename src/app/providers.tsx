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

function getEnv(name: string) {
  const v = (process.env[name] || '').trim()
  return v || null
}

export function Providers({ children }: PropsWithChildren) {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  // ✅ env 누락 시: throw 하지 말고 UI로 종료 (앱 전체 크래시 방지)
  if (!url || !anon) {
    const missing = !url ? 'NEXT_PUBLIC_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
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

  // ✅ 여기부터는 url/anon이 확정이라 supabase는 절대 null이 아님
  const supabase = useMemo(() => createBrowserClient<Database>(url, anon), [url, anon])

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
