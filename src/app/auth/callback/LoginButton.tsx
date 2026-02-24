// src/app/auth/callback/LoginButton.tsx
'use client'

import { useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/browser'
import { googleSignInWithSelectAccount } from '@/lib/googleSignIn'

type Props = {
  // ✅ 로그인 성공 후 이동 경로(기본 /coach)
  nextPath?: string
  // ✅ 버튼 문구 커스텀
  label?: string
}

export default function LoginButton({ nextPath = '/coach', label = 'Sign in with Google' }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    if (loading) return
    setLoading(true)
    try {
      /**
       * ✅ 중요한 포인트:
       * googleSignInWithSelectAccount 내부에서 supabase.auth.signInWithOAuth 를 호출할 텐데,
       * redirectTo 가 명확해야 콜백이 안정적으로 /auth/callback 으로 돌아옴.
       *
       * 네 googleSignInWithSelectAccount 구현이 redirectTo를 내부에서 세팅한다면
       * 아래처럼 nextPath를 query로 넘길 수 있게 확장하는 걸 추천.
       */
      await googleSignInWithSelectAccount(supabase, { nextPath })
    } catch {
      // ✅ 로그인은 "선택"이니까, 실패해도 UX 상 조용히 종료(팝업/모달 트리거 방지)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      className="rounded-lg bg-black px-4 py-2 text-white text-sm font-semibold disabled:opacity-60"
    >
      {loading ? 'Signing in…' : label}
    </button>
  )
}