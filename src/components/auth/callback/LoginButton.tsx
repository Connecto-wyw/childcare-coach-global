// src/components/auth/callback/LoginButton.tsx
'use client'

import { useCallback, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Props = {
  next?: string
}

export default function LoginButton({ next = '/coach' }: Props) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)

  const signInKakao = useCallback(async () => {
    try {
      setLoading(true)
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          // 카카오 동의항목: 이메일/닉네임/프로필 이미지
          scopes: 'account_email profile_nickname profile_image',
        },
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, next])

  return (
    <button
      onClick={signInKakao}
      disabled={loading}
      className="px-4 py-2 rounded-md border text-sm disabled:opacity-60"
    >
      {loading ? '연결 중' : '카카오로 로그인'}
    </button>
  )
}
