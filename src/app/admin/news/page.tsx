'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsPost = {
  id: string
  title: string
  slug: string
  content?: string
  created_at: string
}

export default function AdminNewsPage() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newsList, setNewsList] = useState<NewsPost[]>([])

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news_posts')
      .select('id, title, slug, content, created_at')
      .order('created_at', { ascending: false })

    setNewsList(data || [])
  }

  const handleSubmit = async () => {
    if (!title || !slug) {
      alert('제목과 슬러그는 필수입니다.')
      return
    }

    if (editingId) {
      // 수정
      const { error } = await supabase
        .from('news_posts')
        .update({ title, slug, content })
        .eq('id', editingId)

      if (error) {
        alert('수정 실패: ' + error.message)
      } else {
        clearForm()
        fetchNews()
      }
    } else {
      // 신규 등록
      const { error } = await supabase.from('news_posts').insert({
        title,
        slug,
        content,
      })

      if (error) {
        alert('등록 실패: ' + error.message)
      } else {
        clearForm()
        fetchNews()
      }
    }
  }

  const handleEdit = (post: NewsPost) => {
    setEditingId(post.id)
    setTitle(post.title)
    setSlug(post.slug)
    setContent(post.content || '')
  }

  const handleDelete = async (id: string) => {
    const ok = confirm('정말 삭제하시겠습니까?')
    if (!ok) return

    const { error } = await supabase.from('news_posts').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      if (editingId === id) clearForm()
      fetchNews()
    }
  }

  const clearForm = () => {
    setTitle('')
    setSlug('')
    setContent('')
    setEditingId(null)
  }

  useEffect(() => {
    fetchNews()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">🛠️ 뉴스 관리 (Admin)</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          {editingId ? '뉴스 수정' : '새 뉴스 등록'}
        </h2>
        <input
          placeholder="제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full mb-2 p-2 bg-gray-800 text-white rounded"
        />
        <input
          placeholder="슬러그 (예: first-news)"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="w-full mb-2 p-2 bg-gray-800 text-white rounded"
        />
        <textarea
          placeholder="본문 내용"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full mb-3 p-2 h-32 bg-gray-800 text-white rounded"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-80"
          >
            {editingId ? '수정' : '등록'}
          </button>
          {editingId && (
            <button
              onClick={clearForm}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:opacity-80"
            >
              취소
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">뉴스 목록</h2>
        <ul className="space-y-2">
          {newsList.map(post => (
            <li key={post.id} className="border-b border-gray-600 pb-1">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-lg font-medium">{post.title}</span>{' '}
                  <span className="text-sm text-gray-400">/news/{post.slug}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => handleEdit(post)}
                    className="text-blue-400 hover:underline"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-red-400 hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
