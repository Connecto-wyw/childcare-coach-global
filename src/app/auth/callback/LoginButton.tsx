// src/app/auth/callback/LoginButton.tsx
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
    // 기본은 현재 도메인 + /auth/callback
    if (redirectTo) return redirectTo
    if (typeof window === 'undefined') return '/auth/callback'
    return `${window.location.origin}/auth/callback`
  }, [redirectTo])

  const signIn = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: cb,
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
