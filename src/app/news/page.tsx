// app/news/page.tsx
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

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news_posts')
      .select('id, title, slug, created_at')
      .order('created_at', { ascending: false })

    setNewsList(data || [])
  }

  useEffect(() => {
    fetchNews()
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">📰 뉴스</h1>
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
    </div>
  )
}
