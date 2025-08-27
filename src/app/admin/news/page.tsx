// src/app/admin/news/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsPost = {
  id: string
  title: string
  slug: string
  url?: string | null
  content?: string | null
  created_at: string
}

export default function AdminNewsPage() {
  const [newsList, setNewsList] = useState<NewsPost[]>([])

  // URL 빠른 등록용
  const [newsUrl, setNewsUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // 편집용
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news_posts')
      .select('id, title, slug, url, content, created_at')
      .order('created_at', { ascending: false })
    setNewsList(data || [])
  }

  useEffect(() => {
    fetchNews()
  }, [])

  // URL만 등록
  const submitUrlOnly = async () => {
    const u = newsUrl.trim()
    if (!u) return setErr('URL을 입력하세요.')
    try {
      // 간단 유효성 체크
      new URL(u)
    } catch {
      return setErr('유효한 URL이 아닙니다.')
    }

    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/news/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data.error || '등록 실패')
        return
      }
      setNewsUrl('')
      await fetchNews()
    } finally {
      setSaving(false)
    }
  }

  // 편집 시작
  const handleEdit = (post: NewsPost) => {
    setEditingId(post.id)
    setTitle(post.title ?? '')
    setSlug(post.slug ?? '')
    setContent(post.content ?? '')
    setErr('')
  }

  // 편집 저장
  const saveEdit = async () => {
    if (!editingId) return
    if (!title || !slug) {
      setErr('제목과 슬러그는 필수입니다.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase
        .from('news_posts')
        .update({ title, slug, content })
        .eq('id', editingId)
      if (error) {
        setErr('수정 실패: ' + error.message)
        return
      }
      clearEdit()
      await fetchNews()
    } finally {
      setSaving(false)
    }
  }

  const deletePost = async (id: string) => {
    const ok = confirm('정말 삭제하시겠습니까?')
    if (!ok) return
    const { error } = await supabase.from('news_posts').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      if (editingId === id) clearEdit()
      fetchNews()
    }
  }

  const clearEdit = () => {
    setEditingId(null)
    setTitle('')
    setSlug('')
    setContent('')
    setErr('')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">🛠️ 뉴스 관리 (Admin)</h1>

      {/* URL 빠른 등록 (기본) / 편집 모드 전환 */}
      {!editingId ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">URL로 빠른 등록</h2>
          <div className="flex gap-2">
            <input
              placeholder="https://example.com/news/123"
              value={newsUrl}
              onChange={(e) => setNewsUrl(e.target.value)}
              className="w-full p-2 bg-gray-800 text-white rounded"
            />
            <button
              onClick={submitUrlOnly}
              disabled={saving}
              className="px-4 py-2 bg-[#3EB6F1] text-white rounded hover:opacity-90 disabled:opacity-60"
            >
              {saving ? '등록 중...' : '등록'}
            </button>
          </div>
          {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
        </div>
      ) : (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">뉴스 수정</h2>
          <input
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-2 p-2 bg-gray-800 text-white rounded"
          />
          <input
            placeholder="슬러그 (예: first-news)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full mb-2 p-2 bg-gray-800 text-white rounded"
          />
          <textarea
            placeholder="본문 내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full mb-3 p-2 h-32 bg-gray-800 text-white rounded"
          />
          {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-80 disabled:opacity-60"
            >
              {saving ? '저장 중...' : '수정'}
            </button>
            <button
              onClick={clearEdit}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:opacity-80 disabled:opacity-60"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div>
        <h2 className="text-xl font-semibold mb-3">뉴스 목록</h2>
        <ul className="space-y-2">
          {newsList.map((post) => (
            <li key={post.id} className="border-b border-gray-600 pb-1">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <div className="truncate">
                    <span className="text-lg font-medium">{post.title}</span>{' '}
                    <span className="text-sm text-gray-400">/news/{post.slug}</span>
                  </div>
                  {post.url ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gray-400 underline break-all"
                    >
                      {post.url}
                    </a>
                  ) : null}
                </div>
                <div className="flex gap-3 text-sm shrink-0">
                  <button
                    onClick={() => handleEdit(post)}
                    className="text-blue-400 hover:underline"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
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
