'use client'

import { useMemo } from 'react'
import { getSupabaseBrowserClient } from '@/lib/browser'

export default function LoginButton() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const signIn = async () => {
    // ✅ 1) 서버 쿠키 세션부터 강제 삭제
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {}

    // ✅ 2) 클라이언트 세션도 삭제(이중 안전)
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch {}

    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // ✅ 계정 선택 강제
        queryParams: {
          prompt: 'select_account consent',
        },
      },
    })

    if (error) {
      console.error('[signInWithOAuth] error:', error)
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      className="rounded-lg bg-black px-4 py-2 text-white text-sm font-semibold"
    >
      Sign in with Google
    </button>
  )
}
