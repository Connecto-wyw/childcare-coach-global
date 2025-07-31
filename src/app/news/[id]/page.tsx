'use client'

import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

type NewsItem = {
  id: string
  title: string
  content: string
  created_at: string
}

// ✅ 이 타입을 따로 빼서 선언해줘
interface PageProps {
  params: { id: string }
}

export default function NewsDetailPage({ params }: PageProps) {
  const [news, setNews] = useState<NewsItem | null>(null)

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, content, created_at')
        .eq('id', params.id)
        .single()

      if (!error && data) setNews(data)
    }

    fetchNews()
  }, [params.id])

  if (!news) {
    return <p className="text-gray-400 p-4">뉴스를 불러오는 중입니다...</p>
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">{news.title}</h1>
        <p className="text-sm text-gray-400 text-right mb-6">
          {new Date(news.created_at).toLocaleDateString()}
        </p>
        <div className="whitespace-pre-wrap text-base text-gray-100">
          {news.content}
        </div>
      </div>
    </main>
  )
}
