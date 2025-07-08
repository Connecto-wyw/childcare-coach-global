'use client'

import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* 로고 + 타이틀 */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-4xl font-bold">AI 육아코치</h1>
        </div>

        {/* 챗봇 */}
        <div className="mb-12">
          <ChatBox />
        </div>

        {/* 추가 영역: 오늘의 팁 + 인디언밥 추천 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 오늘의 육아 팁 컴포넌트 */}
          <TipSection />

          {/* 인디언밥 추천 콘텐츠 */}
          <aside className="bg-[#444444] p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3 text-[#eae3de]">✨ 인디언밥 추천 콘텐츠</h2>
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
      </div>
    </main>
  )
}
