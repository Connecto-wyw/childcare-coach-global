'use client'

import { useState } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'

export default function TeamNewPage() {
  const user = useUser()
  const supabaseClient = useSupabaseClient()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')

  const handleLogin = async () => {
    await supabaseClient.auth.signInWithOAuth({ provider: 'google' })
  }

  const addPost = async () => {
    if (!title || !nickname || !content) {
      alert('모든 필드를 입력해 주세요.')
      return
    }

    const { error } = await supabaseClient.from('team_posts').insert([
      {
        title,
        nickname,
        content,
        user_id: user?.id ?? null,
      },
    ])

    if (error) {
      alert('글 작성에 실패했습니다.')
      console.error(error)
    } else {
      router.push('/team')
    }
  }

  if (!user) {
    // 로그인 안 된 상태에서는 로그인 버튼만 보여줌
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] flex items-center justify-center">
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-[#8a1a1d] rounded text-white hover:opacity-90"
        >
          구글 로그인 후 글 작성 가능
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">글 작성</h1>
      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 mb-4 rounded text-black"
      />
      <input
        type="text"
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        className="w-full p-2 mb-4 rounded text-black"
      />
      <textarea
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-2 mb-4 rounded text-black h-40 resize-none"
      />
      <button
        onClick={addPost}
        className="px-6 py-3 bg-[#8a1a1d] rounded text-white hover:opacity-90"
      >
        등록
      </button>
    </main>
  )
}
