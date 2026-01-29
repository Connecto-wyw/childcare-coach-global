// src/app/admin/team/[teamId]/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthUser, useSupabase } from '@/app/providers'
import type { Database } from '@/lib/database.types'

const BUCKET = 'team-images'

type TeamRow = Database['public']['Tables']['teams']['Row']
type PricingRow = Database['public']['Tables']['team_pricing_rules']['Row']

type DiscountStep = { participants: number; discount_percent: number }

function safeFileExt(name: string) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'png'
}

function clampNumber(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function normalizeSteps(steps: DiscountStep[]) {
  return steps
    .map((s) => ({
      participants: Math.max(1, Math.floor(Number(s.participants || 0))),
      discount_percent: clampNumber(Number(s.discount_percent || 0), 0, 100),
    }))
    .filter((s) => s.participants > 0)
    .sort((a, b) => a.participants - b.participants)
}

export default function AdminTeamDetailSettingsPage() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuthUser()
  const params = useParams()
  const router = useRouter()

  const teamId = useMemo(() => String((params as any)?.teamId ?? ''), [params])
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // teams 기본 필드(기존 유지)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [tag1, setTag1] = useState('')
  const [tag2, setTag2] = useState('')
  const [thumbUrl, setThumbUrl] = useState<string>('') // teams.image_url
  const [thumbFile, setThumbFile] = useState<File | null>(null)

  // ✅ 상세설정(A): 상세 이미지 + 상세 텍스트
  const [detailImageUrl, setDetailImageUrl] = useState<string>('') // teams.detail_image_url
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null)
  const [detailMarkdown, setDetailMarkdown] = useState('') // teams.detail_markdown

  // ✅ 가격설정(A): base/min/currency/discount_steps
  const [basePrice, setBasePrice] = useState<number>(0)
  const [minPrice, setMinPrice] = useState<number>(0)
  const [currency, setCurrency] = useState<string>('KRW')
  const [steps, setSteps] = useState<DiscountStep[]>([
    { participants: 10, discount_percent: 10 },
    { participants: 30, discount_percent: 20 },
  ])

  // ---------- 권한 체크 ----------
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

  // ---------- 데이터 로드 ----------
  const fetchAll = async () => {
    if (!teamId) return
    setLoading(true)

    const [{ data: team, error: teamErr }, { data: pricing, error: pricingErr }] = await Promise.all([
      supabase
        .from('teams')
        .select('id,name,purpose,tag1,tag2,image_url,detail_image_url,detail_markdown')
        .eq('id', teamId)
        .maybeSingle(),
      supabase
        .from('team_pricing_rules')
        .select('team_id,base_price,min_price,currency,discount_steps')
        .eq('team_id', teamId)
        .maybeSingle(),
    ])

    if (teamErr) console.error('[teams] error:', teamErr)
    if (!team) {
      setLoading(false)
      return
    }

    setName(team.name ?? '')
    setPurpose(team.purpose ?? '')
    setTag1(team.tag1 ?? '')
    setTag2(team.tag2 ?? '')
    setThumbUrl(team.image_url ?? '')
    setDetailImageUrl((team as any).detail_image_url ?? '')
    setDetailMarkdown((team as any).detail_markdown ?? '')

    if (pricingErr) {
      console.error('[team_pricing_rules] error:', pricingErr)
    }

    if (pricing) {
      const bp = Number((pricing as any).base_price ?? 0)
      const mp = Number((pricing as any).min_price ?? 0)
      setBasePrice(Number.isFinite(bp) ? bp : 0)
      setMinPrice(Number.isFinite(mp) ? mp : 0)
      setCurrency(String((pricing as any).currency ?? 'KRW'))

      const rawSteps = (pricing as any).discount_steps
      if (Array.isArray(rawSteps)) {
        setSteps(
          normalizeSteps(
            rawSteps.map((x: any) => ({
              participants: Number(x?.participants ?? 0),
              discount_percent: Number(x?.discount_percent ?? 0),
            }))
          )
        )
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    loadAdminFlag()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  // ---------- 업로드 ----------
  const uploadToBucket = async (file: File, kind: 'thumb' | 'detail') => {
    if (!user) return null
    setUploading(true)

    const ext = safeFileExt(file.name)
    const path = `team/${teamId}/${kind}_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

    if (upErr) {
      console.error(upErr)
      alert(upErr.message)
      setUploading(false)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = data?.publicUrl ?? null

    setUploading(false)
    return publicUrl
  }

  // ---------- 저장 ----------
  const save = async () => {
    if (!user) return
    if (!name.trim()) {
      alert('팀 이름은 필수야.')
      return
    }
    if (!teamId) {
      alert('teamId가 비었어.')
      return
    }

    setSaving(true)

    // 1) 이미지 업로드(선택된 경우만)
    let finalThumb = thumbUrl || null
    if (thumbFile) {
      const url = await uploadToBucket(thumbFile, 'thumb')
      if (!url) {
        setSaving(false)
        return
      }
      finalThumb = url
      setThumbUrl(url)
    }

    let finalDetailImg = detailImageUrl || null
    if (detailImageFile) {
      const url = await uploadToBucket(detailImageFile, 'detail')
      if (!url) {
        setSaving(false)
        return
      }
      finalDetailImg = url
      setDetailImageUrl(url)
    }

    // 2) teams 업데이트 (기존 입력 유지 + 상세 입력 추가)
    const teamPayload: Partial<TeamRow> & { detail_image_url?: string | null; detail_markdown?: string | null } = {
      name: name.trim(),
      purpose: purpose.trim() ? purpose.trim() : null,
      tag1: tag1.trim() ? tag1.trim() : null,
      tag2: tag2.trim() ? tag2.trim() : null,
      image_url: finalThumb,
      // ✅ A: 상세용
      detail_image_url: finalDetailImg,
      detail_markdown: detailMarkdown.trim() ? detailMarkdown.trim() : null,
    }

    const { error: teamErr } = await supabase.from('teams').update(teamPayload as any).eq('id', teamId)
    if (teamErr) {
      console.error(teamErr)
      alert(teamErr.message)
      setSaving(false)
      return
    }

    // 3) pricing upsert
    const normalized = normalizeSteps(steps)
    const bp = Number(basePrice || 0)
    const mp = Number(minPrice || 0)

    const pricingPayload: Partial<PricingRow> & { discount_steps?: any } = {
      team_id: teamId,
      base_price: Number.isFinite(bp) ? bp : 0,
      min_price: Number.isFinite(mp) ? mp : 0,
      currency: currency || 'KRW',
      discount_steps: normalized as any,
    }

    // upsert는 unique(team_id) 필요
    const { error: prErr } = await supabase.from('team_pricing_rules').upsert(pricingPayload as any, {
      onConflict: 'team_id',
    })

    if (prErr) {
      console.error(prErr)
      alert(prErr.message)
      setSaving(false)
      return
    }

    setSaving(false)
    alert('저장 완료')
    router.refresh()
  }

  // ---------- 렌더 ----------
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
          <h1 className="text-2xl font-bold">Admin / Team Detail</h1>
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
          <p className="text-gray-300 mt-2">어드민 권한 확인이 안 됨(profiles/RLS 가능성).</p>
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center">
        <p className="text-gray-400">불러오는 중…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">팀 상세 설정</h1>
            <p className="text-sm text-gray-400 mt-1">Team ID: {teamId}</p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/team" className="px-4 py-2 bg-gray-700 rounded hover:opacity-90">
              목록
            </Link>
            <button
              onClick={save}
              disabled={saving || uploading}
              className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? '업로드 중…' : saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>

        {/* 기본 정보(기존 유지) */}
        <section className="mt-6 bg-[#222] border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold">기본 정보</h2>

          <div className="mt-4 grid gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="팀 이름 (필수)"
              className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
            />
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="팀 목적(설명)"
              className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400 resize-none h-24"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={tag1}
                onChange={(e) => setTag1(e.target.value)}
                placeholder="태그 1"
                className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
              />
              <input
                value={tag2}
                onChange={(e) => setTag2(e.target.value)}
                placeholder="태그 2"
                className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-[#444] p-2">
                <div className="text-xs text-gray-300 mb-2">썸네일 이미지</div>
                <input type="file" accept="image/*" onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)} />
              </div>

              <div className="rounded bg-[#444] p-2">
                <div className="text-xs text-gray-300 mb-2">썸네일 미리보기</div>
                <div className="w-full aspect-[4/3] bg-[#111] rounded overflow-hidden border border-gray-700">
                  {thumbFile ? (
                    <img src={URL.createObjectURL(thumbFile)} alt="thumb" className="w-full h-full object-cover" />
                  ) : thumbUrl ? (
                    <img src={thumbUrl} alt="thumb" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">이미지 없음</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 상세 페이지용 */}
        <section className="mt-6 bg-[#222] border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold">상세 페이지 콘텐츠</h2>

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-[#444] p-2">
                <div className="text-xs text-gray-300 mb-2">상세 이미지</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDetailImageFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="rounded bg-[#444] p-2">
                <div className="text-xs text-gray-300 mb-2">상세 이미지 미리보기</div>
                <div className="w-full aspect-[4/3] bg-[#111] rounded overflow-hidden border border-gray-700">
                  {detailImageFile ? (
                    <img
                      src={URL.createObjectURL(detailImageFile)}
                      alt="detail"
                      className="w-full h-full object-cover"
                    />
                  ) : detailImageUrl ? (
                    <img src={detailImageUrl} alt="detail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">이미지 없음</div>
                  )}
                </div>
              </div>
            </div>

            <textarea
              value={detailMarkdown}
              onChange={(e) => setDetailMarkdown(e.target.value)}
              placeholder="상세 텍스트(마크다운). 예: 소개, 일정, 준비물, 안내사항..."
              className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400 resize-none h-48"
            />
          </div>
        </section>

        {/* 가격/할인 */}
        <section className="mt-6 bg-[#222] border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold">가격 & 할인 규칙</h2>

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                placeholder="기본 가격"
                className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
              />
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value))}
                placeholder="최소 가격"
                className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
              />
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="통화 (KRW)"
                className="w-full p-2 rounded bg-[#444] text-white placeholder-gray-400"
              />
            </div>

            <div className="text-sm text-gray-300 mt-2">할인 스텝 (N명 참여 시 N% 할인)</div>

            <div className="space-y-2">
              {steps.map((s, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    type="number"
                    value={s.participants}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, participants: v } : x)))
                    }}
                    className="col-span-2 p-2 rounded bg-[#444] text-white"
                    placeholder="참여자 수"
                  />
                  <input
                    type="number"
                    value={s.discount_percent}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, discount_percent: v } : x)))
                    }}
                    className="col-span-2 p-2 rounded bg-[#444] text-white"
                    placeholder="할인율(%)"
                  />
                  <button
                    type="button"
                    onClick={() => setSteps((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-2 rounded bg-gray-700 hover:opacity-90"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSteps((prev) => [...prev, { participants: 10, discount_percent: 10 }])}
              className="mt-2 px-4 py-2 rounded bg-gray-700 hover:opacity-90 w-fit"
            >
              + 스텝 추가
            </button>

            <p className="text-xs text-gray-500 mt-3">
              * 저장 시 스텝은 자동 정렬/정규화됨(참여자 수 오름차순).
              <br />* base_price/min_price/currency/discount_steps는 team_pricing_rules에 저장됨.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
