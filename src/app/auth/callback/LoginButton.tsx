// src/app/auth/callback/LoginButton.tsx
'use client'

import { useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/browser'

type Props = {
  provider?: 'google' | 'kakao'
  redirectTo?: string
  className?: string
  children?: React.ReactNode
}

export default function LoginButton({
  provider = 'google',
  redirectTo,
  className,
  children,
}: Props) {
  // ✅ Supabase client는 싱글톤을 가져다 씀 (중복 생성 방지)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [loading, setLoading] = useState(false)

  async function onClick() {
    try {
      setLoading(true)

      // ✅ redirectTo가 없으면 현재 origin 기준으로 callback으로 보냄
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''

      const finalRedirectTo =
        redirectTo ?? `${origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: finalRedirectTo,
        },
      })

      if (error) {
        console.error('signInWithOAuth error:', error)
        alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={className ?? 'px-4 py-2 rounded bg-black text-white'}
    >
      {children ?? (loading ? 'Signing in...' : 'Sign in')}
    </button>
  )
}
