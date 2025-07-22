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
      if (user === undefined) return // 세션 로딩 중

      if (!user) {
        router.replace('/survey') // 로그인 실패 시 설문으로 이동
        return
      }

      try {
        const { data, error } = await supabase
          .from('survey_answers')
          .select('question_id')
          .eq('user_id', user.id)
          .in('question_id', [3, 5, 10, 11]) // 4개 질문만 확인

        if (error) {
          console.error('❌ 설문 응답 확인 실패:', error)
          router.replace('/survey')
          return
        }

        const answeredCount = data ? data.length : 0
        const allAnswered = answeredCount === 4 // 4개 다 있어야 완료

        router.replace(allAnswered ? '/coach' : '/survey')
      } catch (err) {
        console.error('❌ 예외 발생:', err)
        router.replace('/survey')
      }
    }

    checkAndRedirect()
  }, [user, router])

  return <p>로그인 처리 중입니다...</p>
}
