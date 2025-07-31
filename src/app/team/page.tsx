'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Post = {
  id: string
  title: string
  nickname: string
  created_at: string
  content: string
}

export default function TeamPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('team_posts')
      .select('id, title, nickname, created_at, content')
      .order('created_at', { ascending: false })
    if (!error && data) setPosts(data)
  }

  useEffect(() => {
    fetchPosts()
  }, [])

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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans relative">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">TALK</h1>

        {posts.length === 0 ? (
          <p className="text-gray-400">게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map(post => (
              <li
                key={post.id}
                className="border-b border-gray-600 pb-2 flex flex-col"
              >
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleExpand(post.id)}
                >
                  <p className="text-lg">{post.title}</p>
                </div>

                {/* 작성자 및 작성일시 */}
                <div className="text-sm text-gray-400 text-right mt-1">
                  작성자: {post.nickname} · {new Date(post.created_at).toLocaleString()}
                </div>

                {/* 내용 펼쳐진 경우에만 노출 */}
                {expandedId === post.id && (
                  <div className="mt-2 text-gray-300 whitespace-pre-wrap">
                    {post.content}
                  </div>
                )}
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
          <div
            className="fixed inset-0 bg-black bg-opacity-60"
            onClick={() => setShowModal(false)}
          ></div>

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
