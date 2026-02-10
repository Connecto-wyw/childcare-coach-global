// src/app/auth/callback/LoginButton.tsx
'use client'

import { useCallback, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/browser'

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

export default function LoginButton() {
  const [loading, setLoading] = useState(false)

  const signInWithGoogle = useCallback(async () => {
    if (loading) return
    setLoading(true)

    try {
      const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
      const base =
        envSite.length > 0
          ? stripTrailingSlash(envSite)
          : typeof window !== 'undefined'
          ? window.location.origin
          : ''

      const redirectTo = `${base}/auth/callback`

      const supabase = createSupabaseBrowserClient()

      // ✅ 1) "이 브라우저에서 이전에 로그인했던 세션"을 먼저 끊어버림 (자동로그인 방지)
      // scope: 'local' = 현재 브라우저 로컬 세션만 제거
      await supabase.auth.signOut({ scope: 'local' })

      // ✅ 2) Google 쪽도 "선택 + 재인증"을 최대한 강제
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
            max_age: '0', // ✅ 가능한 경우 재인증 강제 (자동으로 다른 계정 타는 문제 줄임)
          },
        },
      })
    } finally {
      setLoading(false)
    }
  }, [loading])

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      className="px-3 py-2 rounded bg-black text-white text-[14px] font-semibold disabled:opacity-60"
    >
      {loading ? 'Opening Google…' : 'Continue with Google'}
    </button>
  )
}
