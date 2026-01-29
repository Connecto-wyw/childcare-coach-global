// src/app/admin/team/[teamId]/activities/ActivitiesClient.tsx
'use client'

import { useMemo, useState } from 'react'
import { useSupabase } from '@/app/providers'
import type { Tables } from '@/lib/database.types'

type ActivityRow = Tables<'team_activities'>

const BUCKET = 'team-images' // 이미 팀에서 쓰는 버킷 그대로 사용 (원하면 activity-images로 분리 가능)

function safeFileExt(name: string) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'png'
}

function ymd(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US')
  } catch {
    return ''
  }
}

export default function ActivitiesClient({
  teamId,
  initial,
}: {
  teamId: string
  initial: ActivityRow[]
}) {
  const supabase = useSupabase()

  const [list, setList] = useState<ActivityRow[]>(initial ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  // 폼(생성/수정 공용)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState<number>(0)
  const [startsAt, setStartsAt] = useState<string>('')
  const [endsAt, setEndsAt] = useState<string>('')

  const [imageUrl, setImageUrl] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setBody('')
    setIsActive(true)
    setSortOrder(0)
    setStartsAt('')
    setEndsAt('')
    setImageUrl('')
    setImageFile(null)
    setErr('')
  }

  const openCreate = () => {
    resetForm()
  }

  const openEdit = (a: ActivityRow) => {
    setEditingId(a.id)
    setTitle(a.title ?? '')
    // body 컬럼이 있으면 그걸, 없으면 description을
    const b = ((a as any).body ?? a.description ?? '') as string
    setBody(b)
    setIsActive(Boolean((a as any).is_active ?? true))
    setSortOrder(Number((a as any).sort_order ?? 0))
    setStartsAt((a.starts_at ?? '') as any)
    setEndsAt((a.ends_at ?? '') as any)
    setImageUrl(((a as any).image_url ?? '') as string)
    setImageFile(null)
    setErr('')
  }

  const previewUrl = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile)
    return imageUrl || ''
  }, [imageFile, imageUrl])

  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl ? imageUrl : null

    setUploading(true)
    setErr('')

    const ext = safeFileExt(imageFile.name)
    const path = `team-activities/${teamId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, imageFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: imageFile.type || undefined,
    })

    if (upErr) {
      setUploading(false)
      setErr('Upload failed: ' + upErr.message)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = data?.publicUrl ?? null

    setUploading(false)
    return publicUrl
  }

  const refetch = async () => {
    const { data, error } = await supabase
      .from('team_activities')
      .select('id, team_id, title, body, description, image_url, is_active, sort_order, starts_at, ends_at, created_at')
      .eq('team_id', teamId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      setErr(error.message)
      return
    }
    setList((data ?? []) as ActivityRow[])
  }

  const save = async () => {
    const t = title.trim()
    if (!t) {
      setErr('Title is required.')
      return
    }

    setSaving(true)
    setErr('')

    const finalImageUrl = await uploadImageIfNeeded()
    if (imageFile && !finalImageUrl) {
      setSaving(false)
      return
    }

    const payload: any = {
      team_id: teamId,
      title: t,
      // body 컬럼을 쓸 거면 body로 저장
      body: body.trim() ? body.trim() : null,
      // description 컬럼도 남겨두고 싶으면 동기화(선택)
      description: body.trim() ? body.trim() : null,
      image_url: finalImageUrl ? finalImageUrl : null,
      is_active: Boolean(isActive),
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      starts_at: startsAt ? startsAt : null,
      ends_at: endsAt ? endsAt : null,
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('team_activities').update(payload).eq('id', editingId)
        if (error) {
          setErr('Update failed: ' + error.message)
          return
        }
      } else {
        const { error } = await supabase.from('team_activities').insert([payload])
        if (error) {
          setErr('Create failed: ' + error.message)
          return
        }
      }

      resetForm()
      await refetch()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    const ok = confirm('Delete this activity?')
    if (!ok) return

    const { error } = await supabase.from('team_activities').delete().eq('id', id)
    if (error) {
      setErr('Delete failed: ' + error.message)
      return
    }
    if (editingId === id) resetForm()
    refetch()
  }

  // 간단한 sort up/down (숫자 바꾸는 방식)
  const bumpSort = async (id: string, delta: number) => {
    const row = list.find((x) => x.id === id)
    if (!row) return
    const cur = Number((row as any).sort_order ?? 0)
    const next = cur + delta

    const { error } = await supabase.from('team_activities').update({ sort_order: next } as any).eq('id', id)
    if (error) {
      setErr('Sort update failed: ' + error.message)
      return
    }
    refetch()
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* LEFT: 리스트 */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold">Activities</h2>
          <button
            onClick={openCreate}
            className="rounded-lg bg-[#1e1e1e] px-4 py-2 text-[13px] font-semibold text-white"
          >
            + New
          </button>
        </div>

        <p className="mt-2 text-[13px] font-medium text-[#b4b4b4]">
          정렬은 sort_order 오름차순. is_active=false는 팀 상세 페이지에서 숨김.
        </p>

        {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{err}</div>}

        <div className="mt-6 space-y-3">
          {list.length === 0 ? (
            <div className="rounded-xl border border-[#e9e9e9] p-5 text-[13px] font-medium text-[#b4b4b4]">
              No activities yet.
            </div>
          ) : (
            list.map((a) => {
              const active = Boolean((a as any).is_active ?? true)
              const so = Number((a as any).sort_order ?? 0)
              const img = ((a as any).image_url ?? '') as string
              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-[#e9e9e9] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[15px] font-semibold">{a.title}</div>
                        {!active && (
                          <span className="rounded-full bg-[#f3f3f3] px-3 py-1 text-[12px] font-semibold text-[#b4b4b4]">
                            hidden
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[12px] font-medium text-[#b4b4b4]">
                        sort_order: {so} · {ymd(a.created_at)}
                      </div>
                    </div>

                    <div className="shrink-0 flex gap-2">
                      <button
                        onClick={() => bumpSort(a.id, -1)}
                        className="rounded-lg border border-[#e9e9e9] px-3 py-2 text-[12px] font-semibold"
                        title="sort -1"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => bumpSort(a.id, +1)}
                        className="rounded-lg border border-[#e9e9e9] px-3 py-2 text-[12px] font-semibold"
                        title="sort +1"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-lg bg-[#f0f7fd] px-3 py-2 text-[12px] font-semibold text-[#3497f3]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        className="rounded-lg bg-[#9F1D23] px-3 py-2 text-[12px] font-semibold text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {img ? (
                    <div className="mt-3 overflow-hidden rounded-xl bg-[#f3f3f3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={a.title} className="h-40 w-full object-cover" />
                    </div>
                  ) : null}

                  <div className="mt-3 line-clamp-2 text-[13px] font-medium text-[#8f8f8f]">
                    {(((a as any).body ?? a.description ?? '') as string) || '—'}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT: 편집 폼 */}
      <div className="rounded-2xl border border-[#e9e9e9] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold">{editingId ? 'Edit Activity' : 'Create Activity'}</h2>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-[13px] font-semibold text-[#3497f3] hover:underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[13px] font-semibold">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#e9e9e9] px-4 py-3 text-[15px] font-medium outline-none"
              placeholder="Activity title"
            />
          </div>

          <div>
            <label className="text-[13px] font-semibold">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#e9e9e9] px-4 py-3 text-[15px] font-medium outline-none"
              rows={6}
              placeholder="Explain this activity..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold">is_active</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="text-[13px] font-medium text-[#8f8f8f]">
                  {isActive ? 'Visible' : 'Hidden'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-semibold">sort_order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-[#e9e9e9] px-4 py-3 text-[15px] font-medium outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold">starts_at</label>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e9e9e9] px-4 py-3 text-[15px] font-medium outline-none"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold">ends_at</label>
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e9e9e9] px-4 py-3 text-[15px] font-medium outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-semibold">Image</label>
            <div className="mt-2 rounded-xl border border-[#e9e9e9] p-3">
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              <div className="mt-3 overflow-hidden rounded-xl bg-[#f3f3f3]">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="preview" className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center text-[13px] font-medium text-[#b4b4b4]">
                    No image
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || uploading}
            className="mt-2 h-[56px] w-full rounded-xl bg-[#1e1e1e] text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
