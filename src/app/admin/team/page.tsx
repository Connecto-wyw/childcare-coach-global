// src/app/admin/team/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthUser, useSupabase } from '@/app/providers'
import type { Database } from '@/lib/database.types'

type TeamWithCounts = Database['public']['Functions']['get_teams_with_counts']['Returns'][number]

const BUCKET = 'team-images'

function safeFileExt(name: string) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'png'
}

export default function AdminTeamsPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthUser()

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [teams, setTeams] = useState<TeamWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TeamWithCounts | null>(null)

  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [participantCount, setParticipantCount] = useState<number>(0)
  const [tag1, setTag1] = useState('')
  const [tag2, setTag2] = useState('')

  const [imageUrl, setImageUrl] = useState<string>('') // 최종 저장될 URL
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const resetForm = () => {
    setName('')
    setPurpose('')
    setParticipantCount(0)
    setTag1('')
    setTag2('')
    setImageUrl('')
    setImageFile(null)
  }

  const loadAdminFlag = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[profiles.is_admin] error:', error)
      setIsAdmin(null)
      return
    }

    setIsAdmin(Boolean(data?.is_admin))
  }

  const fetchTeams = async () => {
    setLoading(true)

    const { data, error } = await supabase.rpc('get_teams_with_counts')

    if (error) {
      console.error('[get_teams_with_counts] error:', error)
      setTeams([])
      setLoading(false)
      return
    }

    setTeams((data ?? []) as TeamWithCounts[])
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    loadAdminFlag()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    fetchTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setShowModal(true)
  }

  const openEdit = (t: TeamWithCounts) => {
    setEditing(t)
    setName(t.name ?? '')
    setPurpose(t.purpose ?? '')
    setParticipantCount(Number(t.participant_count ?? 0))
    setTag1(t.tag1 ?? '')
    setTag2(t.tag2 ?? '')
    setImageUrl(t.image_url ?? '')
    setImageFile(null)
    setShowModal(true)
  }

  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!user) return null

    if (!imageFile) return imageUrl ? imageUrl : null

    setUploading(true)

    const ext = safeFileExt(imageFile.name)
    const path = `team/${user.id}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, imageFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: imageFile.type || undefined,
    })

    if (upErr) {
      setUploading(false)
      alert(upErr.message)
      console.error(upErr)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = data?.publicUrl ?? null

    setUploading(false)
    return publicUrl
  }

  const save = async () => {
    if (!user) return

    if (!name.trim()) {
      alert('팀 이름은 필수야.')
      return
    }

    setSaving(true)

    const finalImageUrl = await uploadImageIfNeeded()
    if (imageFile && !finalImageUrl) {
      setSaving(false)
      return
    }

    const payloadForTeamsTable = {
      name: name.trim(),
      purpose: purpose.trim() ? purpose.trim() : null,
      tag1: tag1.trim() ? tag1.trim() : null,
      tag2: tag2.trim() ? tag2.trim() : null,
      image_url: finalImageUrl,
    }

    // ✅ 수정이면 그대로 update
    if (editing?.id) {
      const { error } = await supabase.from('teams').update(payloadForTeamsTable).eq('id', editing.id)
      if (error) {
        setSaving(false)
        alert(error.message)
        console.error(error)
        return
      }

      setSaving(false)
      setShowModal(false)
      setEditing(null)
      resetForm()
      fetchTeams()
      return
    }

    // ✅ 생성이면 insert 후 생성된 id를 받아서 바로 상세 설정으로 이동
    const { data: inserted, error: insErr } = await supabase
      .from('teams')
      .insert([{ owner_id: user.id, ...payloadForTeamsTable }])
      .select('id')
      .single()

    if (insErr) {
      setSaving(false)
      alert(insErr.message)
      console.error(insErr)
      return
    }

    const newId = inserted?.id
    setSaving(false)
    setShowModal(false)
    setEditing(null)
    resetForm()
    fetchTeams()

    if (newId) {
      router.push(`/admin/team/${newId}`)
      return
    }
  }

  const remove = async (id: string) => {
    if (!confirm('정말 삭제할까?')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) {
      alert(error.message)
      console.error(error)
      return
    }
    fetchTeams()
  }

  const previewUrl = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile)
    return imageUrl || ''
  }, [imageFile, imageUrl])

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center">
        <p className="text-gray-400">로그인 확인 중…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#222] border border-gray-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold">Admin / Teams</h1>
          <p className="text-gray-300 mt-2">어드민은 로그인 후 사용 가능해.</p>
        </div>
      </main>
    )
  }

  if (isAdmin === null) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#222] border border-gray-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold">확인 중</h1>
          <p className="text-gray-300 mt-2">
            어드민 권한을 확인하지 못했어. (profiles row가 없거나 RLS로 막혔을 수 있음)
          </p>
        </div>
      </main>
    )
  }

  if (isAdmin === false) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#222] border border-gray-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold">권한 없음</h1>
          <p className="text-gray-300 mt-2">이 계정은 어드민 권한이 없어.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin / Teams</h1>
          <button onClick={openCreate} className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-90">
            팀 추가
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 mt-6">불러오는 중…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-400 mt-6">등록된 TEAM이 없습니다.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-[#222] border border-gray-700 rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="flex gap-4 min-w-0">
                  <div className="w-20 h-16 bg-[#111] rounded overflow-hidden shrink-0">
                    {t.image_url ? (
                      <img
                        src={t.image_url}
                        alt={t.name ?? 'team'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-sm text-gray-300 mt-1 line-clamp-2">{t.purpose ?? ''}</div>
                    <div className="text-xs text-gray-400 mt-2">
                      참여자 {t.participant_count ?? 0}명 · 태그: {t.tag1 ?? '-'} / {t.tag2 ?? '-'}
                    </div>
                  </div>
                </div>

                {/* ✅ 우측 버튼 영역 */}
                <div className="flex gap-2 shrink-0 items-center">
                  {/* ✅ 여기: 팀 상세 설정 페이지로 이동 */}
                  <Link
                    href={`/admin/team/${t.id}`}
                    className="px-3 py-1.5 rounded bg-[#3EB6F1] text-black hover:opacity-90 text-sm font-semibold"
                    title="상세 이미지/텍스트/가격/할인 규칙 설정"
                  >
                    상세 설정 →
                  </Link>

                  <button onClick={() => openEdit(t)} className="px-3 py-1.5 rounded bg-gray-700 hover:opacity-90">
                    수정
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="px-3 py-1.5 rounded bg-[#9F1D23] text-white hover:opacity-90"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-opacity-60"
            style={{ backgroundColor: '#282828' }}
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-[#222] rounded-lg p-6 w-full max-w-lg border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-white">{editing ? '팀 수정' : '팀 추가'}</h2>

              <input
                type="text"
                placeholder="팀 이름 (필수)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 mb-3 rounded bg-[#444] text-white placeholder-gray-400"
              />

              <textarea
                placeholder="팀 목적"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-2 mb-3 rounded bg-[#444] text-white placeholder-gray-400 resize-none h-24"
              />

              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="number"
                  placeholder="참여자 수(자동 계산)"
                  value={participantCount}
                  onChange={(e) => setParticipantCount(Number(e.target.value))}
                  className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
                  disabled
                />
                <div className="w-full p-2 rounded bg-[#444] text-white">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  placeholder="태그 1"
                  value={tag1}
                  onChange={(e) => setTag1(e.target.value)}
                  className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="태그 2"
                  value={tag2}
                  onChange={(e) => setTag2(e.target.value)}
                  className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
                />
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-300 mb-2">이미지 미리보기</div>
                <div className="w-full aspect-[4/3] bg-[#111] rounded overflow-hidden border border-gray-700">
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">이미지 없음</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded text-white hover:opacity-80"
                >
                  취소
                </button>
                <button
                  onClick={save}
                  disabled={saving || uploading}
                  className="px-4 py-2 bg-[#9F1D23] rounded text-white hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? '업로드 중…' : saving ? '저장 중…' : '저장'}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                * 이미지는 Supabase Storage(team-images)에 업로드되고, teams.image_url에 public URL이 저장됨.
                <br />
                * 참여자 수는 team_members 기반 자동 계산(view/RPC)라 어드민 입력은 비활성.
                <br />
                * 팀 생성 후에는 자동으로 “상세 설정” 페이지로 이동함.
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
