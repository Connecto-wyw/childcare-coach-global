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
  const [showModal, setShowModal] = useState(false)

  // 글 작성 폼 상태
  const [title, setTitle] = useState('')
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')

  // 게시글 불러오기
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('team_posts')
      .select('id, title, nickname, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setPosts(data)
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  // 게시글 등록
  const addPost = async () => {
    if (!title || !nickname || !content) {
      alert('모든 필드를 입력해 주세요.')
      return
    }

    const { error } = await supabase.from('team_posts').insert([
      { title, nickname, content }
    ])

    if (!error) {
      setTitle('')
      setNickname('')
      setContent('')
      setShowModal(false)
      fetchPosts()
    } else {
      alert('글 작성에 실패했습니다.')
      console.error(error)
    }
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans relative">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">TEAM 게시판</h1>

        {/* 게시글 리스트 */}
        {posts.length === 0 ? (
          <p className="text-gray-400">게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map(post => (
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

      {/* 글 작성 버튼 */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 px-5 py-3 bg-[#8a1a1d] text-white rounded-full shadow-lg hover:opacity-80"
      >
        글 작성
      </button>

      {/* 모달 */}
      {showModal && (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-60"
            onClick={() => setShowModal(false)}
          ></div>

          {/* 모달 박스 */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-[#444] rounded-lg p-6 w-full max-w-md relative">
              <h2 className="text-2xl font-semibold mb-4 text-white">글 작성</h2>
              <input
                type="text"
                placeholder="제목"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2 mb-3 rounded bg-[#666] text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full p-2 mb-3 rounded bg-[#666] text-white placeholder-gray-400"
              />
              <textarea
                placeholder="내용"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full p-2 mb-4 rounded bg-[#666] text-white placeholder-gray-400 resize-none h-32"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded text-white hover:opacity-80"
                >
                  취소
                </button>
                <button
                  onClick={addPost}
                  className="px-4 py-2 bg-[#8a1a1d] rounded text-white hover:opacity-90"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
