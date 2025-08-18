'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    ;(async () => {
      await supabase.auth.getUser() // 세션 확인만 하고
      router.replace('/coach')      // 항상 /coach로
    })()
  }, [supabase, router])

  return <p>로그인 처리 중입니다...</p>
}
