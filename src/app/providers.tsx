// src/app/providers.tsx
'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getSupabaseBrowserClient } from '@/lib/browser'

type AuthUserState = {
  user: User | null
  loading: boolean
}

type ProviderValue = {
  supabase: SupabaseClient<Database>
  auth: AuthUserState
}

const Ctx = createContext<ProviderValue | null>(null)

export function Providers({ children }: PropsWithChildren) {
  // ✅ 브라우저 client는 싱글톤으로 1개만
  const [supabase] = useState(() => getSupabaseBrowserClient())
  const [auth, setAuth] = useState<AuthUserState>({ user: null, loading: true })

  useEffect(() => {
    let mounted = true

    // ✅ auth 상태 업데이트 헬퍼 (중복 업데이트 최소화)
    const setAuthSafe = (next: AuthUserState) => {
      if (!mounted) return
      setAuth((prev) => {
        // loading만 바뀌는 경우 포함해도, 불필요 rerender 최소화
        const sameUser = (prev.user?.id ?? null) === (next.user?.id ?? null)
        const sameLoading = prev.loading === next.loading
        if (sameUser && sameLoading) return prev
        return next
      })
    }

    // ✅ 딥링크 리다이렉트 헬퍼
    const checkAuthReturn = (sessionUser: User | null) => {
      if (sessionUser && typeof window !== 'undefined') {
        const returnUrl = sessionStorage.getItem('kyk_auth_return')
        if (returnUrl) {
          sessionStorage.removeItem('kyk_auth_return')
          window.location.href = returnUrl
        }
      }
    }

    // 1) 초기 세션 로드
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const session: Session | null = data.session ?? null
        setAuthSafe({ user: session?.user ?? null, loading: false })
        checkAuthReturn(session?.user ?? null)
      })
      .catch(() => {
        setAuthSafe({ user: null, loading: false })
      })

    // 2) 세션 변화 구독
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSafe({ user: session?.user ?? null, loading: false })
      checkAuthReturn(session?.user ?? null)
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