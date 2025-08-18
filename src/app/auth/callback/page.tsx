'use client'
export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const sp = new URLSearchParams(window.location.search)
      const code = sp.get('code')
      const next = sp.get('next') || '/coach'
      const oauthErr = sp.get('error')
      const oauthErrDesc = sp.get('error_description')

      if (oauthErr) {
        router.replace(`/login?error=${encodeURIComponent(oauthErrDesc || oauthErr)}`)
        return
      }
      if (!code) {
        router.replace('/login?error=missing_code')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`)
        return
      }

      router.replace(next)
    }
    run()
  }, [router])

  return null
}
