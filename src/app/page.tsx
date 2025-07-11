'use client'

import { useEffect } from 'react'
import { useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const user = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user === undefined) return // 아직 로그인 체크 중
    if (user) {
      router.replace('/coach') // 로그인 O → 코칭 페이지
    } else {
      router.replace('/survey') // 로그인 X → 설문 페이지
    }
  }, [user, router]) // ✅ 수정됨

  return null
}
