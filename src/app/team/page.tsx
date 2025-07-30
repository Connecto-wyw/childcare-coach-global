'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Post = {
  id: string
  title: string
  nickname: string
  created_at: string
}

export default function TeamPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState('')
  const [nickname, setNickname] = useState('')

  // 게시글 불러오기
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('team_posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setPosts(data)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  // 게시글 등록
  const addPost = async () => {
    if (!title || !nickname) return
    const { error } = await supabase.from('team_posts').insert([
      { title, nickname },
    ])
    if (!error) {
      setTitle('')
      setNickname('')
      fetchPosts() // 새 글 반영
    }
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">TEAM 게시판</h1>

        {/* 글 작성 폼 */}
        <div className="mb-8 space-y-4">
          <input
            type="text"
            className="w-full p-2 rounded text-black"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            className="w-full p-2 rounded text-black"
            placeholder="닉네임을 입력하세요"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button
            onClick={addPost}
            className="px-4 py-2 bg-[#8a1a1d] text-white rounded hover:opacity-90"
          >
            글 작성
          </button>
        </div>

        {/* 게시글 리스트 */}
        {posts.length === 0 ? (
          <p className="text-gray-400">아직 게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li
                key={post.id}
                className="border-b border-gray-600 pb-2 flex justify-between items-center"
              >
                <div>
                  <p className="text-lg">{post.title}</p>
                  <p className="text-sm text-gray-400">
                    작성자: {post.nickname}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
