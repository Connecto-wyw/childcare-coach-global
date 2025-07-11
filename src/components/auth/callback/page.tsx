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
      if (user === undefined) return // 아직 유저 확인 중

      // 로그인 안 된 경우 → 설문 페이지로
      if (!user) {
        router.replace('/survey')
        return
      }

      // 로그인 O → 설문 여부에 따라 이동
      const { data, error } = await supabase
        .from('survey_answers')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (error) {
        console.error('❌ 설문 확인 오류:', error)
        router.replace('/survey')
        return
      }

      router.replace(data?.length ? '/coach' : '/survey')
    }

    checkAndRedirect()
  }, [user, router])

  return null
}
