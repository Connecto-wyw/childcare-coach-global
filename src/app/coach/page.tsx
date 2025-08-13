'use client'

import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function CoachPage() {
  const [keywords, setKeywords] = useState<string[]>([])
  const [chatInput, setChatInput] = useState('')

  // 인기 키워드 4개 가져오기
  useEffect(() => {
    async function fetchKeywords() {
      const { data, error } = await supabase
        .from('popular_keywords')
        .select('keyword')
        .order('order', { ascending: true })
        .limit(4)

      if (!error && data) {
        setKeywords(data.map(k => k.keyword))
      }
    }
    fetchKeywords()
  }, [])

  // 키워드 클릭 시 질문 입력창에 자동 입력
  const handleKeywordClick = (keyword: string) => {
    setChatInput(keyword)
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        {/* 인기 키워드 (중앙 정렬) */}
        <section className="mb-8 text-center">
          <h2 className="text-lg font-semibold mb-3">요즘 인기 키워드</h2>
          <div className="flex justify-center gap-3">
            {keywords.map((kw) => (
              <button
                key={kw}
                className="bg-gray-600 text-white text-sm px-4 py-1 rounded hover:opacity-90 transition"
                onClick={() => handleKeywordClick(kw)}
              >
                {kw}
              </button>
            ))}
          </div>
        </section>

        {/* 챗봇 */}
        <ChatBox chatInput={chatInput} setChatInput={setChatInput} />

        {/* 오늘의 팁 */}
        <section className="mt-12 text-center max-w-xl mx-auto">
          <TipSection />
        </section>
      </div>
    </main>
  )
}
