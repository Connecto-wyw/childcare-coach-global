'use client'

import { useEffect } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Logo from '@/assets/logo.png' // coach에서 쓰는 것과 동일 경로

export default function HomePage() {
  const user = useUser()
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    if (user) router.replace('/coach')
  }, [user, router])

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }
  const loginKakao = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: 'https://hrvbdyusoybsviiuboac.supabase.co/auth/v1/callback' },
    })
  }

  if (user) return null

  return (
    <main className="min-h-screen bg-[#191919]">
      <div className="mx-auto max-w-md px-6 pt-12 pb-16 text-center">
        {/* 로고 위치 및 크기 coach와 맞춤 */}
        <div className="flex flex-col items-center">
          <Image src={Logo} alt="인디언밥 로고" className="h-20 w-auto mb-8" priority />
          <h1 className="text-2xl font-bold text-[#eae3de]">AI 육아코치</h1>
          <p className="mt-3 text-sm text-[#c8c2bd]">
            인디언밥이 만든 맞춤형 AI 육아코치. 로그인 후 바로 시작하세요.
          </p>
        </div>

        {/* 로그인 버튼 2개 */}
        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={loginKakao}
            className="w-full rounded-lg bg-[#9F1D23] py-3 text-sm font-medium text-white hover:bg-[#7e171c]"
          >
            카카오 로그인
          </button>
          <button
            onClick={loginGoogle}
            className="w-full rounded-lg bg-[#3EB6F1] py-3 text-sm font-medium text-white hover:bg-[#299ed9]"
          >
            구글 로그인
          </button>
        </div>
      </div>
    </main>
  )
}
