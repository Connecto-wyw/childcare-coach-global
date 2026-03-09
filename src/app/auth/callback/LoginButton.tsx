// src/app/auth/callback/LoginButton.tsx
'use client'

import { useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/browser'

type Props = {
  nextPath?: string
  label?: string
}

export default function LoginButton({
  nextPath = '/coach',
  label = 'Sign in with Google',
}: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    if (loading) return

    setLoading(true)

    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('next', nextPath)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        throw error
      }
    } catch (e) {
      console.error('Google login failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {loading ? 'Signing in…' : label}
    </button>
  )
}