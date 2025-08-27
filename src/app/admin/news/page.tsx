// src/app/admin/news/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsPost = {
  id: string
  title: string
  slug: string
  content?: string | null
  created_at: string
}

function yyyymmddhhmmss(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return base || `news-${yyyymmddhhmmss()}`
}

export default function AdminNewsPage() {
  const [newsList, setNewsList] = useState<NewsPost[]>([])

  // 작성/편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // 슬러그: 기본은 자동, 필요 시 고급에서 수동 수정
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // 제목이 바뀌고 슬러그를 직접 건드린 적이 없으면 자동 슬러그 갱신
  const autoSlug = useMemo(() => slugify(title), [title])
  useEffect(() => {
    if (!slugTouched) setSlug(autoSlug)
  }, [autoSlug, slugTouched])

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_posts')
      .select('id, title, slug, content, created_at')
      .order('created_at', { ascending: false })
    if (error) {
      setErr(error.message)
      return
    }
    setNewsList(data || [])
  }

  useEffect(() => {
    fetchNews()
  }, [])

  const clearForm = () => {
    setEditingId(null)
    setTitle('')
    setContent('')
    setSlug('')
    setSlugTouched(false)
    setShowAdvanced(false)
    setErr('')
  }

  const handleSubmit = async () => {
    const t = title.trim()
    const c = content.trim()
    const s = (slugTouched ? slug : autoSlug).trim() || slugify(title || 'news')

    if (!t) return setErr('제목은 필수입니다.')
    if (!s) return setErr('슬러그 생성에 실패했습니다.')

    setSaving(true)
    setErr('')
    try {
      if (editingId) {
        const { error } = await supabase
          .from('news_posts')
          .update({ title: t, slug: s, content: c })
          .eq('id', editingId)
        if (error) return setErr('수정 실패: ' + error.message)
      } else {
        const { error } = await supabase.from('news_posts').insert({
          title: t,
          slug: s,
          content: c,
        })
        if (error) return setErr('등록 실패: ' + error.message)
      }
      clearForm()
      await fetchNews()
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (post: NewsPost) => {
    setEditingId(post.id)
    setTitle(post.title ?? '')
    setContent(post.content ?? '')
    setSlug(post.slug ?? '')
    setSlugTouched(true) // 기존 글은 슬러그가 있으므로 수정 시 수동 모드로 간주
    setShowAdvanced(false)
    setErr('')
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">🛠️ 뉴스 관리 (Admin)</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          {editingId ? '뉴스 수정' : '새 뉴스 등록'}
        </h2>

        {/* 제목 */}
        <input
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-2 p-2 bg-gray-800 text-white rounded"
        />

        {/* 내용 */}
        <textarea
          placeholder="본문 내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full mb-3 p-2 h-40 bg-gray-800 text-white rounded"
        />

        {/* 고급 옵션: 슬러그 수동 수정 */}
        <details
          className="mb-3"
          open={showAdvanced}
          onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm text-gray-300">
            고급 옵션(슬러그 수정)
          </summary>
          <div className="mt-2">
            <input
              placeholder={`자동 생성: ${autoSlug}`}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className="w-full p-2 bg-gray-800 text-white rounded"
            />
            <p className="mt-1 text-xs text-gray-400">
              비워두면 제목 기준으로 자동 생성됩니다.
            </p>
          </div>
        </details>

        {err && <p className="mb-3 text-sm text-red-300">{err}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-80 disabled:opacity-60"
          >
            {saving ? (editingId ? '저장 중...' : '등록 중...') : editingId ? '수정' : '등록'}
          </button>
          {editingId && (
            <button
              onClick={clearForm}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:opacity-80 disabled:opacity-60"
            >
              취소
            </button>
          )}
        </div>
      </div>

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
                  <p className="text-xs text-gray-400">
                    {new Date(post.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div className="flex gap-3 text-sm shrink-0">
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
