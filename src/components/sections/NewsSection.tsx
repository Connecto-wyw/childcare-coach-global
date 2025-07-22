'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsItem = {
  id: string
  title: string
  content?: string
  url?: string
  thumbnail?: string
  published_at: string
}

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([])

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('parenting_news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('❌ 뉴스 불러오기 실패:', error.message)
      } else {
        setNews(data || [])
      }
    }

    fetchNews()
  }, [])

  if (news.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold mb-4">📰 최신 육아 뉴스</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url || '#'}
            target={item.url ? '_blank' : '_self'}
            className="block border border-gray-600 p-4 rounded bg-gray-800 hover:bg-gray-700 transition"
          >
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-40 object-cover rounded mb-3"
              />
            )}
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            {item.content && (
              <p className="text-gray-300 text-sm mt-1">
                {item.content.slice(0, 60)}...
              </p>
            )}
          </a>
        ))}
      </div>
    </section>
  )
}
