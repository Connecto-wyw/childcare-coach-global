// src/app/admin/news/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'
import type { Tables } from '@/lib/database.types'

type NewsPost = Tables<'news_posts'>

const NEWS_IMAGE_BUCKET = 'news-images' // ✅ Supabase Storage 버킷명(다르면 여기만 수정)

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
  const { user } = useAuthUser()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [newsList, setNewsList] = useState<NewsPost[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ✅ 썸네일 상태
  // coverPath: DB에 저장되는 값(스토리지 path 또는 전체 URL)
  // coverFile: 새로 선택한 파일(업로드는 Save/Create 시)
  // coverPreviewUrl: 화면 표시용 URL(스토리지 public URL 또는 objectURL)
  const [coverPath, setCoverPath] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [coverObjectUrl, setCoverObjectUrl] = useState<string | null>(null) // ✅ objectURL 추적(메모리 누수 방지)

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const autoSlug = useMemo(() => slugify(title), [title])
  useEffect(() => {
    if (!slugTouched) setSlug(autoSlug)
  }, [autoSlug, slugTouched])

  const computeCoverPreview = (pathOrUrl: string | null) => {
    if (!pathOrUrl) return null
    const raw = String(pathOrUrl).trim()
    if (!raw) return null

    if (/^https?:\/\//i.test(raw)) return raw

    const { data } = supabase.storage.from(NEWS_IMAGE_BUCKET).getPublicUrl(raw.replace(/^\//, ''))
    return data?.publicUrl || null
  }

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_posts')
      .select('id, title, slug, content, created_at, user_id, cover_image_url')
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '' // ✅ 핵심: 실제 input 값을 비움
    }
  }

  const clearCoverSelection = () => {
    // ✅ 선택된 파일만 제거(저장된 coverPath는 유지)
    revokeObjectUrlIfAny()
    setCoverFile(null)
    clearFileInputValue()
    setCoverPreviewUrl(computeCoverPreview(coverPath))
  }

  const removeCover = () => {
    // ✅ 저장 값까지 비움(실제 DB 반영은 Save/Create 눌러야 적용됨)
    revokeObjectUrlIfAny()
    setCoverPath(null)
    setCoverFile(null)
    clearFileInputValue()
    setCoverPreviewUrl(null)
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
    setCoverPath(null)
    setCoverFile(null)
    setCoverPreviewUrl(null)
    clearFileInputValue()
  }

  const uploadCoverIfNeeded = async (finalSlug: string) => {
    if (!coverFile) return coverPath

    const ext = extFromFileName(coverFile.name)
    const fileName = `news/${finalSlug}_${yyyymmddhhmmss()}.${ext}`

    const { error } = await supabase.storage
      .from(NEWS_IMAGE_BUCKET)
      .upload(fileName, coverFile, { upsert: true, contentType: coverFile.type })

    if (error) throw new Error('Cover upload failed: ' + error.message)

    // ✅ DB에는 path 저장
    return fileName
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
      const uploadedCoverPath = await uploadCoverIfNeeded(s)

      if (editingId) {
        const { error } = await supabase
          .from('news_posts')
          .update({
            title: t,
            slug: s,
            content: c,
            cover_image_url: uploadedCoverPath,
          })
          .eq('id', editingId)

        if (error) return setErr('Update failed: ' + error.message)
      } else {
        const { error } = await supabase.from('news_posts').insert([
          {
            title: t,
            slug: s,
            content: c,
            user_id: user?.id ?? null,
            cover_image_url: uploadedCoverPath,
          },
        ])

        if (error) return setErr('Create failed: ' + error.message)
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
    setEditingId(post.id)
    setTitle(post.title ?? '')
    setContent(post.content ?? '')
    setSlug(post.slug ?? '')
    setSlugTouched(true)
    setShowAdvanced(false)
    setErr('')

    revokeObjectUrlIfAny()
    clearFileInputValue()

    const cp = (post as any).cover_image_url as string | null
    setCoverPath(cp || null)
    setCoverFile(null)
    setCoverPreviewUrl(computeCoverPreview(cp || null))
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

  const onPickCoverFile = (file: File | null) => {
    // ✅ 같은 파일 다시 선택해도 onChange가 잘 타게 하려면,
    // clearFileInputValue()가 선행되어야 하는데,
    // 사용자가 버튼(클리어) 눌렀을 때 우리가 이미 value='' 처리함.
    revokeObjectUrlIfAny()
    setCoverFile(file)

    if (!file) {
      setCoverPreviewUrl(computeCoverPreview(coverPath))
      return
    }

    const url = URL.createObjectURL(file)
    setCoverObjectUrl(url)
    setCoverPreviewUrl(url)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">🛠️ News Admin</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{editingId ? 'Edit News' : 'Create News'}</h2>

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

        {/* ✅ 썸네일 업로드 섹션 */}
        <div className="mb-4">
          <div className="text-sm text-gray-300 mb-2">Thumbnail (cover image)</div>

          <div className="flex items-start gap-4">
            <div className="w-[140px] h-[140px] bg-gray-700 rounded overflow-hidden shrink-0 flex items-center justify-center">
              {coverPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreviewUrl} alt="cover preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-xs text-gray-300">No image</div>
              )}
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => onPickCoverFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-300"
              />

              <div className="mt-2 text-xs text-gray-400">
                업로드는 <b>Create/Save</b> 버튼을 누를 때 저장됩니다.
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={clearCoverSelection}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-700 text-white rounded hover:opacity-80 disabled:opacity-60 text-sm"
                >
                  Clear file selection
                </button>

                <button
                  type="button"
                  onClick={removeCover}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:opacity-80 disabled:opacity-60 text-sm"
                >
                  Remove cover (set empty)
                </button>
              </div>

              {(coverPath || coverFile) && (
                <div className="mt-3 text-xs text-gray-400 break-all">
                  <div>Saved value: {coverPath || '(none yet)'}</div>
                  <div>Selected file: {coverFile ? coverFile.name : '(none)'}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <details
          className="mb-3"
          open={showAdvanced}
          onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm text-gray-300">Advanced options (edit slug)</summary>
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
            <p className="mt-1 text-xs text-gray-400">Leave empty to auto-generate from the title.</p>
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
          {newsList.map((post) => {
            const cp = (post as any).cover_image_url as string | null
            const cover = computeCoverPreview(cp || null)

            return (
              <li key={post.id} className="border-b border-gray-600 pb-2">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 bg-gray-700 rounded overflow-hidden shrink-0 flex items-center justify-center">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="thumb" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-300">No</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      <span className="text-lg font-medium">{post.title}</span>{' '}
                      <span className="text-sm text-gray-400">/news/{post.slug}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {post.created_at ? new Date(post.created_at).toLocaleString('en-US') : ''}
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
            )
          })}

          {newsList.length === 0 && <li className="text-sm text-gray-400">No posts yet.</li>}
        </ul>
      </div>
    </div>
  )
}
