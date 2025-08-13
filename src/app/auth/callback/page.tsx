'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  useEffect(() => {
    ;(async () => {
      // 세션만 확인하고 바로 /coach로
      await supabase.auth.getUser() // (실패해도 /coach로 보냄)
      router.replace('/coach')
    })()
  }, [router])

  return <p>로그인 처리 중입니다...</p>
}
