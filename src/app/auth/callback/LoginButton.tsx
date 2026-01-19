// src/app/auth/callback/LoginButton.tsx
'use client'

import { useCallback } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

export default function LoginButton() {
  const supabase = useSupabaseClient()
  const { auth } = supabase

  const signInWithGoogle = useCallback(async () => {
    // ✅ PKCE 안정화: window.origin 대신 고정 Site URL 우선
    const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
    const base =
      envSite.length > 0
        ? stripTrailingSlash(envSite)
        : typeof window !== 'undefined'
        ? window.location.origin
        : ''

    const redirectTo = `${base}/auth/callback?next=/coach`

    await auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }, [auth])

  return (
    <button
      onClick={signInWithGoogle}
      className="px-3 py-2 rounded bg-black text-white text-[14px] font-semibold"
    >
      Continue with Google
    </button>
  )
}
