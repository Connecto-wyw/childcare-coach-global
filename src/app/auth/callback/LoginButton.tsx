// src/components/auth/callback/LoginButton.tsx
'use client'

import { useCallback, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// 👇 환경변수 없으면 현재 브라우저 Origin을 사용
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '')

export default function LoginButton({ next = '/coach' }: { next?: string }) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)

  const signInGoogle = useCallback(async () => {
    setLoading(true)
    try {
      const redirectTo = new URL(
        `/auth/callback?next=${encodeURIComponent(next)}`,
        SITE
      ).toString()

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
    } finally {
      setLoading(false)
    }
  }, [next])

  return (
    <button onClick={signInGoogle} disabled={loading} className="px-4 py-2 rounded border">
      {loading ? 'Connecting…' : 'Sign in with Google'}
    </button>
  )
}
