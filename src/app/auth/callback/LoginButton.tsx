// src/app/auth/callback/LoginButton.tsx
'use client'

import { useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/browser'

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

export default function LoginButton() {
  const signInWithGoogle = useCallback(async () => {
    const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
    const base =
      envSite.length > 0
        ? stripTrailingSlash(envSite)
        : typeof window !== 'undefined'
        ? window.location.origin
        : ''

    const redirectTo = `${base}/auth/callback`

    const supabase = createSupabaseBrowserClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // ✅ 항상 계정 선택 화면 강제
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
  }, [])

  return (
    <button
      onClick={signInWithGoogle}
      className="px-3 py-2 rounded bg-black text-white text-[14px] font-semibold"
    >
      Continue with Google
    </button>
  )
}
