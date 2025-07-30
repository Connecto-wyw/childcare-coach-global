'use client'

import { useEffect, useState } from 'react'
import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
<<<<<<< HEAD
import NavBar from '@/components/layout/NavBar'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
=======
import NewsSection from '@/components/NewsSection'
import NavBar from '@/components/layout/NavBar'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'
>>>>>>> dev
import { supabase } from '@/lib/supabaseClient'

type Keyword = {
  id: string
  keyword: string
}
<<<<<<< HEAD

export default function HomePage() {
  const user = useUser()
  const supabaseClient = useSupabaseClient()
  const [systemPrompt, setSystemPrompt] = useState('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')

  // 설문 응답 기반 systemPrompt 생성
  useEffect(() => {
    const fetchSurveyAnswers = async () => {
      if (!user) return

      const { data, error } = await supabaseClient
        .from('survey_answers')
        .select('question_id, answer')
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ 설문 응답 불러오기 실패:', error.message)
        return
      }

      const answerMap = Object.fromEntries(
        data.map((item) => [item.question_id, item.answer])
      )

      const sysMsg = `사용자의 육아 설문 결과는 다음과 같습니다.
- 가장 중요하게 생각하는 육아 가치는: '${answerMap[3]}'
- 아이와 보내는 하루 시간은: '${answerMap[5]}'
- 아이의 나이는: '${answerMap[10]}세'
- 아이의 성별은: '${answerMap[11]}'

이 정보를 참고하여 부모의 질문에 친절하고 현실적인 육아 코칭을 제공해주세요.`

      setSystemPrompt(sysMsg)
    }

    fetchSurveyAnswers()
  }, [user, supabaseClient])

  // 인기 키워드 불러오기
  useEffect(() => {
    const fetchKeywords = async () => {
      const { data, error } = await supabase
        .from('popular_keywords')
        .select('id, keyword')
        .order('order', { ascending: true })

      if (error) {
        console.error('❌ 인기 키워드 불러오기 실패:', error.message)
      } else {
        setKeywords(data || [])
      }
    }

    fetchKeywords()
  }, [])

  return (
    <main className="min-h-screen bg-[#191919] text-[#eae3de] font-sans">
      {/* 상단 NavBar (HOME / NEWS / TEAM 메뉴 + 로그인 포함) */}
=======

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
>>>>>>> dev
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* 로고 */}
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

<<<<<<< HEAD
        {/* 인기 검색 키워드 */}
        {keywords.length > 0 && (
          <div className="text-center mb-8">
            <h2 className="text-lg font-semibold mb-2">인기 검색 키워드</h2>
            <div className="flex justify-center flex-wrap gap-2">
              {keywords.map((k) => (
                <span
                  key={k.id}
                  onClick={() => setSelectedKeyword(k.keyword)}
                  className="px-3 py-1 bg-gray-700 text-white rounded-full text-sm cursor-pointer hover:bg-gray-600"
                >
                  {k.keyword}
                </span>
              ))}
            </div>
          </div>
        )}
=======
        {/* 뉴스 섹션 */}
        <NewsSection />
>>>>>>> dev

        {/* 챗봇 */}
        <div className="mb-12">
          <ChatBox
            systemPrompt={systemPrompt}
            initialQuestion={selectedKeyword}
          />
        </div>

<<<<<<< HEAD
        {/* 오늘의 팁 + 추천 콘텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
          <TipSection />
          <aside className="bg-[#444444] p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3 text-[#eae3de]">
              ✨ 인디언밥 추천 콘텐츠
            </h2>
            <ul className="text-base space-y-2 text-[#e0dcd7]">
              <li>👨‍👩‍👧 아이 성향 테스트</li>
              <li>🎯 해빗 챌린지로 습관 만들기</li>
              <li>📍 요즘 육아 뉴스 확인</li>
            </ul>
            <a
              href="https://indianbob.me"
              target="_blank"
              className="inline-block mt-4 px-4 py-2 text-base bg-[#8a1a1d] text-[#eae3de] rounded hover:opacity-90"
            >
              인디언밥 앱 다운로드 →
            </a>
          </aside>
        </div>
=======
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
>>>>>>> dev
      </div>
    </main>
  )
}
