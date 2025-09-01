// src/components/auth/callback/LoginButton.tsx
'use client'

import { useCallback, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || // Vercel/배포에서 반드시 설정
  (typeof window !== 'undefined' ? window.location.origin : '') // 로컬 fallback

export default function LoginButton({ next = '/coach' }: { next?: string }) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)

  const signInGoogle = useCallback(async () => {
    setLoading(true)
    try {
      const redirectTo = `${SITE}/auth/callback?next=${encodeURIComponent(next)}`
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
    } finally {
      setLoading(false)
    }
  }, [next, supabase])

  return (
    <button onClick={signInGoogle} disabled={loading} className="px-4 py-2 rounded border">
      {loading ? 'Connecting…' : 'Sign in with Google'}
    </button>
  )
}
