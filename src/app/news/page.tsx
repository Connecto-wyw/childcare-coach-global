'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsPost = {
  id: string
  title: string
  slug: string
  created_at: string
  content: string // 내용 추가
}

export default function NewsListPage() {
  const [newsList, setNewsList] = useState<NewsPost[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null) // 펼쳐진 뉴스 아이디 관리

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news_posts')
      .select('id, title, slug, created_at, content') // content도 포함
      .order('created_at', { ascending: false })

    setNewsList(data || [])
  }

  useEffect(() => {
    fetchNews()
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id)) // 클릭한 뉴스의 펼침/접힘 상태 토글
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">NEWS</h1>
        <ul className="space-y-4">
          {newsList.map((post) => (
            <li key={post.id} className="border-b border-gray-600 pb-2">
              <div
                className="text-lg text-[#3EB6F1] hover:underline cursor-pointer"
                onClick={() => toggleExpand(post.id)} // 클릭 시 펼쳐짐
              >
                {post.title}
              </div>
              <p className="text-sm text-gray-400">
                {new Date(post.created_at).toLocaleDateString()}
              </p>

              {/* 해당 뉴스가 펼쳐졌을 때 내용 표시 */}
              {expandedId === post.id && (
                <div className="mt-2 text-gray-300 whitespace-pre-wrap">
                  {post.content}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
