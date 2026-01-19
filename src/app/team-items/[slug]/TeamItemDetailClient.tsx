// src/app/team-itemss/[slug]/TeamItemDetailClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Database } from '@/lib/database.types'
import { calcTeamItemPricing } from '@/lib/teamPricing'

type TeamItemRow = Database['public']['Tables']['team_items']['Row']

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=60'

function getOrCreateLocalUserId() {
  if (typeof window === 'undefined') return ''
  const key = 'ccg_local_user_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  window.localStorage.setItem(key, id)
  return id
}

export default function TeamItemDetailClient({
  item,
  initialParticipantCount,
}: {
  item: TeamItemRow
  initialParticipantCount: number
}) {
  const [count, setCount] = useState<number>(initialParticipantCount)
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const pricing = useMemo(() => {
    return calcTeamItemPricing({
      basePrice: item.base_price,
      minPrice: item.min_price,
      discountStepPercent: item.discount_step_percent,
      discountStepEvery: item.discount_step_every,
      maxDiscountPercent: item.max_discount_percent,
      participantCount: count,
    })
  }, [item, count])

  const refreshCount = async () => {
    const res = await fetch(`/api/team-itemss/${item.slug}/count`, { cache: 'no-store' })
    if (!res.ok) return
    const json = (await res.json()) as { participant_count: number }
    setCount(json.participant_count ?? 0)
  }

  useEffect(() => {
    // 상세 들어오면 최신 참여자수 한번 갱신
    refreshCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug])

  const onJoin = async () => {
    try {
      setJoining(true)
      const localUserId = getOrCreateLocalUserId()

      const res = await fetch(`/api/team-itemss/${item.slug}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ local_user_id: localUserId }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json?.error || 'join failed')
      }

      setCount(json.participant_count ?? count + 1)
      setToast('참여 완료! 참여자가 늘면 가격이 내려가.')
      setTimeout(() => setToast(null), 1800)
    } catch (e: any) {
      setToast(e?.message || '에러가 났어')
      setTimeout(() => setToast(null), 1800)
    } finally {
      setJoining(false)
    }
  }

  const onShare = async () => {
    const url = window.location.href
    const shareData = {
      title: item.title,
      text: item.description || '',
      url,
    }

    // 1) Web Share API (모바일에서 “앱 선택 + 친구 보내기” 가능)
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // 사용자가 취소한 케이스는 그냥 무시
      }
    }

    // 2) fallback: 링크 복사
    try {
      await navigator.clipboard.writeText(url)
      setToast('링크 복사 완료')
      setTimeout(() => setToast(null), 1500)
    } catch {
      setToast('복사 실패: 주소창 링크를 직접 복사해줘')
      setTimeout(() => setToast(null), 1800)
    }
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{item.title}</h1>
            <p className="text-white/70 mt-2">{item.description || ''}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              {(item.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-[#3EB6F1] text-black">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onShare}
            className="shrink-0 rounded-xl bg-white/10 border border-white/20 px-4 py-2 hover:bg-white/15"
          >
            공유하기
          </button>
        </div>

        {/* 커버 */}
        <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-[#111]">
          <img
            src={item.cover_image_url || FALLBACK_IMG}
            alt={item.title}
            className="w-full max-h-[520px] object-cover"
          />
        </div>

        {/* 가격/참여 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl bg-[#222] border border-gray-700 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-white/70">현재 참여자</div>
                <div className="text-2xl font-bold mt-1">{count.toLocaleString()}명</div>
              </div>

              <div className="text-right">
                <div className="text-sm text-white/70">현재 가격</div>
                <div className="text-2xl font-bold mt-1">
                  {pricing.currentPrice.toLocaleString()}원
                </div>
                <div className="text-sm text-white/60 mt-1">
                  할인 {pricing.discountPercent}% · 최저 {item.min_price.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 할인 진행 */}
            <div className="mt-4 text-sm text-white/70">
              다음 할인까지{' '}
              <span className="font-semibold text-white">{pricing.toNextStep}</span>명 남음
              {pricing.toNextStep === 0 ? ' (지금 구간 할인 적용됨)' : ''}
            </div>

            <div className="mt-3">
              <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#3EB6F1]"
                  style={{ width: `${pricing.progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/50 mt-2">
                <span>현재 구간</span>
                <span>다음 구간</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#222] border border-gray-700 p-5">
            <button
              onClick={onJoin}
              disabled={joining}
              className="w-full rounded-xl bg-[#3EB6F1] px-4 py-3 font-semibold text-black disabled:opacity-60"
            >
              {joining ? '처리 중…' : '참여하기'}
            </button>

            <div className="text-xs text-white/60 mt-3 leading-relaxed">
              참여자가 늘면 가격이 단계적으로 내려가. <br />
              단, 최소 가격 이하로는 내려가지 않아.
            </div>
          </div>
        </div>

        {/* 갤러리 */}
        {(item.gallery_urls ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(item.gallery_urls ?? []).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl overflow-hidden border border-white/10 bg-[#111] hover:border-white/30"
                >
                  <img src={url} alt="" className="w-full h-40 object-cover" />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {/* 상세 설명 */}
        <section className="mt-8 rounded-2xl bg-[#222] border border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-3">Details</h2>
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed">
            <ReactMarkdown>{item.detail_markdown || ''}</ReactMarkdown>
          </div>
        </section>

        {/* 토스트 */}
        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 text-white px-4 py-2 text-sm border border-white/15">
            {toast}
          </div>
        ) : null}
      </div>
    </main>
  )
}
