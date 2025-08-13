'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/coach') // 로그인 여부 무관하게 /coach로
  }, [router])
  return null
}
