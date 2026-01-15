// src/app/admin/news/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'
import type { Tables } from '@/lib/database.types'

type NewsPost = Tables<'news_posts'>

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
  const supabase = useSupabase()
  const { user, loading } = useAuthUser()

  const [newsList, setNewsList] = useState<NewsPost[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const autoSlug = useMemo(() => slugify(title), [title])
  useEffect(() => {
    if (!slugTouched) setSlug(autoSlug)
  }, [autoSlug, slugTouched])

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_posts')
      .select('id, title, slug, content, created_at, user_id')
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

    if (!t) return setErr('Title is required.')
    if (!s) return setErr('Failed to generate slug.')

    setSaving(true)
    setErr('')

    try {
      if (editingId) {
        const { error } = await supabase
          .from('news_posts')
          .update({ title: t, slug: s, content: c })
          .eq('id', editingId)

        if (error) return setErr('Update failed: ' + error.message)
      } else {
        // ✅ insert는 object도 되지만, 타입/버전 섞일 때 덜 흔들리게 배열로 넣는 게 안정적
        const { error } = await supabase.from('news_posts').insert([
          {
            title: t,
            slug: s,
            content: c,
            // (선택) 작성자 남기고 싶으면
            user_id: user?.id ?? null,
          },
        ])

        if (error) return setErr('Create failed: ' + error.message)
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
    setSlugTouched(true)
    setShowAdvanced(false)
    setErr('')
  }

  const handleDelete = async (id: string) => {
    const ok = confirm('Delete this post?')
    if (!ok) return

    const { error } = await supabase.from('news_posts').delete().eq('id', id)
    if (error) {
      alert('Delete failed: ' + error.message)
    } else {
      if (editingId === id) clearForm()
      fetchNews()
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">🛠️ News Admin</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          {editingId ? 'Edit News' : 'Create News'}
        </h2>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-2 p-2 bg-gray-800 text-white rounded"
        />

        <textarea
          placeholder="Content (Markdown or plain text)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full mb-3 p-2 h-40 bg-gray-800 text-white rounded"
        />

        <details
          className="mb-3"
          open={showAdvanced}
          onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm text-gray-300">
            Advanced options (edit slug)
          </summary>
          <div className="mt-2">
            <input
              placeholder={`Auto: ${autoSlug}`}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className="w-full p-2 bg-gray-800 text-white rounded"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave empty to auto-generate from the title.
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
            {saving ? (editingId ? 'Saving…' : 'Creating…') : editingId ? 'Save' : 'Create'}
          </button>

          {editingId && (
            <button
              onClick={clearForm}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:opacity-80 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">News List</h2>
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
                    {new Date(post.created_at).toLocaleString('en-US')}
                  </p>
                </div>

                <div className="flex gap-3 text-sm shrink-0">
                  <button onClick={() => handleEdit(post)} className="text-blue-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="text-red-400 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}

          {newsList.length === 0 && <li className="text-sm text-gray-400">No posts yet.</li>}
        </ul>
      </div>
    </div>
  )
}
