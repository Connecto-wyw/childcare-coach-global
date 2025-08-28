// src/components/auth/callback/LoginButton.tsx
'use client'

import { useCallback, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.indianbob.ai' // 고정

export default function LoginButton({ next = '/coach' }: { next?: string }) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)

  const signInKakao = useCallback(async () => {
    setLoading(true)
    try {
      const redirectTo = `${SITE}/auth/callback?next=${encodeURIComponent(next)}`
      await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          scopes: 'account_email profile_nickname profile_image',
        },
      })
    } finally {
      setLoading(false)
    }
  }, [next, supabase])

  return (
    <button onClick={signInKakao} disabled={loading} className="px-4 py-2 rounded border">
      {loading ? '연결 중' : '카카오로 로그인'}
    </button>
  )
}
