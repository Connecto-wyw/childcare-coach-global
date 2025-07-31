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
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">NEWS</h1>
        <ul className="space-y-4">
          {newsList.map((post) => (
            <li key={post.id} className="border-b border-gray-600 pb-2">
              <Link href={`/news/${post.slug}`}>
                <div className="text-lg text-[#3EB6F1] hover:underline cursor-pointer">
                  {post.title}
                </div>
              </Link>
              <p className="text-sm text-gray-400">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
