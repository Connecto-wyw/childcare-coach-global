'use client'

import NavBar from '@/components/layout/NavBar'

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-[#191919] text-[#eae3de] font-sans">
      {/* 상단 네비게이션바 */}
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">TEAM</h1>
        <p className="text-gray-400">
          곧 팀원들과 소통할 수 있는 게시판 기능이 추가됩니다.
        </p>
      </div>
    </main>
  )
}
