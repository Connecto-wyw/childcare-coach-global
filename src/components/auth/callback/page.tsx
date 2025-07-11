'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const user = useUser()

  useEffect(() => {
    const checkAndRedirect = async () => {
      // 아직 세션 초기화 중이면 대기
      if (user === undefined) return

      const baseUrl =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://childcare-coach-pro.vercel.app'

      // 로그인 안 된 경우 → /survey 이동
      if (!user) {
        router.replace(`${baseUrl}/survey`)
        return
      }

      // 로그인 O → 설문 여부에 따라 분기
      const { data, error } = await supabase
        .from('survey_answers')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (error) {
        console.error('❌ 설문 확인 중 오류:', error)
        router.replace(`${baseUrl}/survey`)
        return
      }

      const hasSubmitted = data && data.length > 0
      router.replace(`${baseUrl}/${hasSubmitted ? 'coach' : 'survey'}`)
    }

    checkAndRedirect()
  }, [user, router])

  return null
}