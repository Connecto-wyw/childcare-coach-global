'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const run = async () => {
      const code = sp.get('code')
      const next = sp.get('next') || '/coach'
      const oauthErr = sp.get('error')
      const oauthErrDesc = sp.get('error_description')

      // 1) OAuth 단계에서 실패한 경우
      if (oauthErr) {
        console.error('OAuth error:', oauthErr, oauthErrDesc)
        router.replace(`/login?error=${encodeURIComponent(oauthErrDesc || oauthErr)}`)
        return
      }

      // 2) code 없으면 처리 불가
      if (!code) {
        console.error('Missing code param in callback URL')
        router.replace('/login?error=missing_code')
        return
      }

      // 3) PKCE code → 세션 교환
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('exchangeCodeForSession error:', error)
        router.replace(`/login?error=${encodeURIComponent(error.message)}`)
        return
      }

      // 4) 성공 시 목적지로 이동
      router.replace(next)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 최초 1회만 실행

  return null
}
