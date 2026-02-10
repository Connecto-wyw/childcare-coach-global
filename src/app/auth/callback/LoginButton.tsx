// src/app/auth/callback/LoginButton.tsx
'use client'

import { useMemo, useState } from 'react'
import { useSupabase } from '@/app/providers'

type Props = {
  className?: string
  redirectTo?: string
  forceAccountPicker?: boolean // ✅ 추가: 계정 선택 강제
  signOutBeforeSignIn?: boolean // ✅ 추가: 이전 세션 끊고 시작
}

export default function LoginButton({
  className,
  redirectTo,
  forceAccountPicker = true,
  signOutBeforeSignIn = false,
}: Props) {
  const supabase = useSupabase()
  const [loading, setLoading] = useState(false)

  const cb = useMemo(() => {
    if (redirectTo) return redirectTo
    if (typeof window === 'undefined') return '/auth/callback'
    return `${window.location.origin}/auth/callback`
  }, [redirectTo])

  const signIn = async () => {
    try {
      setLoading(true)

      if (signOutBeforeSignIn) {
        // ✅ “이전 계정으로 강제 로그인”처럼 보이는 케이스 방지
        await supabase.auth.signOut()
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: cb,
          queryParams: forceAccountPicker
            ? {
                prompt: 'select_account', // ✅ 매번 계정 선택
              }
            : undefined,
        },
      })

      if (error) console.error('[signInWithOAuth] error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      className={className ?? 'px-4 py-2 rounded bg-black text-white'}
    >
      {loading ? 'Signing in…' : 'Sign in with Google'}
    </button>
  )
}
