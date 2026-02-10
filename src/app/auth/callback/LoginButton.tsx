'use client'

import { useMemo, useState } from 'react'
import { useSupabase } from '@/app/providers'

type Props = {
  className?: string
  redirectTo?: string
}

export default function LoginButton({ className, redirectTo }: Props) {
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

      // ✅ 기존 세션/쿠키/스토리지 꼬임 방지: 항상 로그아웃 후 시작
      await supabase.auth.signOut()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: cb,
          queryParams: {
            // ✅ 매번 계정 선택창 + 재동의(계정 고정 방지에 더 강함)
            prompt: 'consent select_account',
          },
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
