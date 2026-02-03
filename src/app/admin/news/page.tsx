// src/app/admin/news/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'
import type { Tables } from '@/lib/database.types'

type NewsPost = Tables<'news_posts'>

const NEWS_IMAGE_BUCKET = 'news-images'

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

function extFromFileName(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m?.[1] || 'jpg'
}

export default function AdminNewsPage() {
  const supabase = useSupabase()
  const { user, loading } = useAuthUser() as any

  const authed = !!user
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [newsList, setNewsList] = useState<NewsPost[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('') // UI용 content (DB에는 detail_markdown)

  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [coverObjectUrl, setCoverObjectUrl] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const autoSlug = useMemo(() => slugify(title), [title])

  useEffect(() => {
    if (!slugTouched) setSlug(autoSlug)
  }, [autoSlug, slugTouched])

  // ✅ DB 컬럼 기준으로 select
  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_posts')
      .select(
        'id, title, slug, detail_markdown, created_at, user_id, cover_image_url'
      )
      .order('created_at', { ascending: false })

    if (error) {
      setErr(error.message)
      return
    }
    setNewsList((data ?? []) as NewsPost[])
  }

  useEffect(() => {
    fetchNews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const revokeObjectUrlIfAny = () => {
    if (coverObjectUrl) {
      try {
        URL.revokeObjectURL(coverObjectUrl)
      } catch {}
      setCoverObjectUrl(null)
    }
  }

  const clearFileInputValue = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearForm = () => {
    setEditingId(null)
    setTitle('')
    setContent('')
    setSlug('')
    setSlugTouched(false)
    setShowAdvanced(false)
    setErr('')

    revokeObjectUrlIfAny()
    setCoverUrl(null)
    setCoverFile(null)
    setCoverPreviewUrl(null)
    clearFileInputValue()
  }

  const uploadCoverIfNeeded = async (finalSlug: string) => {
    if (!coverFile) return coverUrl

    const ext = extFromFileName(coverFile.name)
    const filePath = `news/${finalSlug}_${yyyymmddhhmmss()}.${ext}`

    const { error } = await supabase.storage
      .from(NEWS_IMAGE_BUCKET)
      .upload(filePath, coverFile, { upsert: true, contentType: coverFile.type })

    if (error) throw new Error('Cover upload failed: ' + error.message)

    const { data } = supabase.storage.from(NEWS_IMAGE_BUCKET).getPublicUrl(filePath)
    if (!data?.publicUrl) throw new Error('Failed to get public URL.')

    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!authed) {
      setErr('You must be logged in to create or edit posts.')
      return
    }

    const t = title.trim()
    const c = content.trim()
    const s = (slugTouched ? slug : autoSlug).trim()

    if (!t) return setErr('Title is required.')
    if (!s) return setErr('Slug is required.')

    setSaving(true)
    setErr('')

    try {
      const uploadedCoverUrl = await uploadCoverIfNeeded(s)

      if (editingId) {
        const { error } = await supabase
          .from('news_posts')
          .update({
            title: t,
            slug: s,
            detail_markdown: c,
            cover_image_url: uploadedCoverUrl,
          })
          .eq('id', editingId)

        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('news_posts').insert({
          title: t,
          slug: s,
          detail_markdown: c,
          user_id: user?.id ?? null,
          cover_image_url: uploadedCoverUrl,
        })

        if (error) throw new Error(error.message)
      }

      clearForm()
      await fetchNews()
    } catch (e: any) {
      setErr(e?.message || 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (post: NewsPost) => {
    if (!authed) {
      setErr('You must be logged in to edit posts.')
      return
    }

    setEditingId(post.id)
    setTitle(post.title ?? '')
    setContent(post.detail_markdown ?? '')
    setSlug(post.slug ?? '')
    setSlugTouched(true)
    setShowAdvanced(false)
    setErr('')

    revokeObjectUrlIfAny()
    clearFileInputValue()

    setCoverUrl(post.cover_image_url ?? null)
    setCoverFile(null)
    setCoverPreviewUrl(post.cover_image_url ?? null)
  }

  const handleDelete = async (id: string) => {
    if (!authed) {
      setErr('You must be logged in to delete posts.')
      return
    }

    if (!confirm('Delete this post?')) return

    const { error } = await supabase.from('news_posts').delete().eq('id', id)
    if (error) alert(error.message)
    else {
      if (editingId === id) clearForm()
      fetchNews()
    }
  }

  const canInteract = authed && !saving

  if (loading) {
    return <div className="p-8 text-gray-300">Checking login…</div>
  }

  if (!authed) {
    return <div className="p-8 text-gray-300">로그인해야 뉴스 관리 가능</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">🛠️ News Admin</h1>

      {/* --- Editor --- */}
      <input
        className="w-full mb-2 p-2 bg-gray-800 text-white rounded"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full mb-3 p-2 h-40 bg-gray-800 text-white rounded"
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {err && <p className="text-red-400 mb-3">{err}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canInteract}
        className="px-4 py-2 bg-[#9F1D23] text-white rounded"
      >
        {editingId ? 'Save' : 'Create'}
      </button>

      {/* --- List --- */}
      <ul className="mt-8 space-y-2">
        {newsList.map((post) => (
          <li key={post.id} className="border-b border-gray-700 py-2">
            <div className="flex justify-between items-center">
              <div>
                <b>{post.title}</b>
                <div className="text-xs text-gray-400">/news/{post.slug}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => handleEdit(post)} className="text-blue-400">
                  Edit
                </button>
                <button onClick={() => handleDelete(post.id)} className="text-red-400">
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
