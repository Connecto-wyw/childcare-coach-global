'use client'

import NewsSection from '@/components/sections/NewsSection'
import NavBar from '@/components/layout/NavBar'

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-[#191919] text-[#eae3de] font-sans">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">최신 육아 뉴스</h1>
        <NewsSection />
      </div>
    </main>
  )
}
