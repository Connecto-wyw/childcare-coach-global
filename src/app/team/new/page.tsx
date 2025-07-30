'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Post = {
  id: string
  title: string
  nickname: string
  created_at: string
}

export default function TeamPage() {
  const [posts, setPosts] = useState<Post[]>([])

  // 게시글 불러오기
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('team_posts')
      .select('id, title, nickname, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setPosts(data)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans relative">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">TEAM 게시판</h1>

        {/* 게시글 리스트 */}
        {posts.length === 0 ? (
          <p className="text-gray-400">게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li
                key={post.id}
                className="border-b border-gray-600 pb-2 flex justify-between items-center"
              >
                <div>
                  <p className="text-lg">{post.title}</p>
                  <p className="text-sm text-gray-400">작성자: {post.nickname}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 글 작성 페이지로 이동하는 플로팅 버튼 */}
      <Link
        href="/team/new"
        className="fixed bottom-6 right-6 px-5 py-3 bg-[#8a1a1d] text-white rounded-full shadow-lg hover:opacity-80"
      >
        글 작성
      </Link>
    </main>
  )
}
