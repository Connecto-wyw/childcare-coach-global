'use client'

import { useEffect, useState } from 'react'
import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import NewsSection from '@/components/NewsSection'
import NavBar from '@/components/layout/NavBar'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'

type Keyword = {
  id: string
  keyword: string
}

export default function CoachPage() {
  const user = useUser()
  const supabaseClient = useSupabaseClient()
  const [systemPrompt, setSystemPrompt] = useState('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')

  const handleLogin = async () => {
    await supabaseClient.auth.signInWithOAuth({ provider: 'google' })
  }

  const handleLogout = async () => {
    await supabaseClient.auth.signOut()
  }

  useEffect(() => {
    // 나중에 systemPrompt나 키워드 불러오는 로직 추가 가능
  }, [])

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* 로고 */}
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        {/* 뉴스 섹션 */}
        <NewsSection />

        {/* 챗봇 */}
        <div className="mb-12">
          <ChatBox />
        </div>

        {/* 오늘의 팁 */}
        <TipSection />

        {/* 로그인 버튼 (테스트용) */}
        {!user && (
          <Button onClick={handleLogin} className="bg-[#8a1a1d] mt-6">
            구글 로그인
          </Button>
        )}
        {user && (
          <Button onClick={handleLogout} className="bg-[#3EB6F1] mt-6">
            로그아웃
          </Button>
        )}
      </div>
    </main>
  )
}
