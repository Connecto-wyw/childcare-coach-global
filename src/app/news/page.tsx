'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type NewsItem = {
  id: string
  title: string
  created_at: string
}

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([])

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
      if (!error && data) {
        setNewsList(data)
      }
    }
    fetchNews()
  }, [])

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">NEWS</h1>
      {newsList.length === 0 ? (
        <p className="text-gray-400">등록된 뉴스가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {newsList.map((item) => (
            <li key={item.id} className="border-b border-gray-700 pb-3">
              <Link
                href={`/news/${item.id}`}
                className="text-[#9F1D23] hover:underline text-xl"
              >
                {item.title}
              </Link>
              <p className="text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
