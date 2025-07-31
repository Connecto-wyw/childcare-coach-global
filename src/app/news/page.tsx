'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsPost = {
  id: string
  title: string
  slug: string
  created_at: string
}

export default function NewsListPage() {
  const [newsList, setNewsList] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, slug, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('뉴스 가져오기 실패:', error.message)
      } else {
        setNewsList(data || [])
      }

      setLoading(false)
    }

    fetchNews()
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">📰 뉴스</h1>

      {loading ? (
        <p className="text-gray-400">로딩 중...</p>
      ) : newsList.length === 0 ? (
        <p className="text-gray-500">등록된 뉴스가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {newsList.map((post) => (
            <li key={post.id}>
              <Link href={`/news/${post.slug}`}>
                <div className="text-lg text-blue-600 hover:underline">{post.title}</div>
              </Link>
              <p className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
