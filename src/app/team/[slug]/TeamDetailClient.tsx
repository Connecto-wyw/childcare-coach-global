'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

type TeamItem = {
  id: string
  title: string
  slug: string
  description: string | null
  tags: string[] | null
  cover_image_url: string | null
  gallery_urls: string[] | null
  detail_markdown: string | null
  base_price: number
  min_price: number
  discount_step_percent: number
  discount_step_every: number
  max_discount_percent: number
}

declare global {
  interface Window {
    Kakao?: any
  }
}

export default function TeamDetailClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<TeamItem | null>(null)
  const [participants, setParticipants] = useState(0)
  const [finalPrice, setFinalPrice] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [joining, setJoining] = useState(false)

  const pageUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.href
  }, [])

  async function fetchDetail() {
    setLoading(true)
    try {
      const res = await fetch(`/api/team-items/${slug}`, { cache: 'no-store' })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error ?? 'failed')
      setItem(json.item)
      setParticipants(json.participants ?? 0)
      setFinalPrice(json.finalPrice ?? null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // 참여자 수/가격 변화를 “보이는 느낌” 주려면 폴링이 제일 단순함
    const t = setInterval(fetchDetail, 5000)
    return () => clearInterval(t)
  }, [slug])

  // 카카오 SDK 로드(선택)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (!key) return
    if (typeof window === 'undefined') return
    if (window.Kakao?.isInitialized?.()) return

    const script = document.createElement('script')
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'
    script.async = true
    script.onload = () => {
      try {
        window.Kakao?.init?.(key)
      } catch {}
    }
    document.body.appendChild(script)
  }, [])

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setShareOpen(false)
    alert('링크 복사 완료')
  }

  async function nativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item?.title ?? 'TEAM',
          text: item?.description ?? '',
          url: window.location.href,
        })
        setShareOpen(false)
      } else {
        alert('이 기기/브라우저는 네이티브 공유를 지원하지 않아. 링크복사로 공유해줘.')
      }
    } catch {
      // 사용자가 취소한 경우도 여기로 들어옴 → 무시
    }
  }

  function kakaoShare() {
    const K = window.Kakao
    if (!K?.Share) {
      alert('카카오 공유 설정이 안 되어 있어. (NEXT_PUBLIC_KAKAO_JS_KEY 확인)')
      return
    }
    K.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: item?.title ?? 'TEAM',
        description: item?.description ?? '',
        imageUrl: item?.cover_image_url ?? 'https://via.placeholder.com/800x400',
        link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
      },
      buttons: [
        { title: '상세 보기', link: { mobileWebUrl: window.location.href, webUrl: window.location.href } },
      ],
    })
    setShareOpen(false)
  }

  // 참여하기: user_id는 너 프로젝트 상황에 맞게 교체
  async function join() {
    if (!item) return
    setJoining(true)
    try {
      const user_id = localStorage.getItem('local_user_id') ?? crypto.randomUUID()
      localStorage.setItem('local_user_id', user_id)

      const res = await fetch(`/api/team-items/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id }),
      })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error ?? 'join failed')
      await fetchDetail()
      alert('참여 완료')
    } catch (e: any) {
      alert(e?.message ?? '참여 실패')
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <div className="p-6 text-white">Loading...</div>
  if (!item) return <div className="p-6 text-white">Not found</div>

  const base = item.base_price
  const min = item.min_price
  const price = finalPrice ?? base
  const discountAmount = Math.max(0, base - price)
  const discountPercent = base > 0 ? Math.round((discountAmount / base) * 100) : 0

  // “가격 떨어지는 모습”을 UI로 보여주기: 진행바(최대할인율 vs 현재할인율)
  const maxDiscount = Math.max(0, item.max_discount_percent)
  const progress = maxDiscount > 0 ? Math.min(100, Math.round((discountPercent / maxDiscount) * 100)) : 0

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            {item.description && <p className="mt-2 text-white/80">{item.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(item.tags ?? []).map((t) => (
                <span key={t} className="rounded-full bg-[#3EB6F1]/20 px-3 py-1 text-sm text-[#9ad8ff]">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShareOpen(true)}
            className="shrink-0 rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15"
          >
            Share
          </button>
        </div>

        {item.cover_image_url && (
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="mt-6 w-full rounded-2xl object-cover"
          />
        )}

        {/* 가격/참여자 */}
        <div className="mt-6 rounded-2xl bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/70">Participants</div>
              <div className="text-xl font-semibold">{participants}명</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/70">Current Price</div>
              <div className="text-2xl font-bold">
                {price.toLocaleString()}원
              </div>
              <div className="mt-1 text-sm text-white/60">
                Base {base.toLocaleString()}원 · Min {min.toLocaleString()}원
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Discount progress</span>
              <span>{discountPercent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#3EB6F1]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-xs text-white/60">
              {item.discount_step_every}명마다 {item.discount_step_percent}%씩 할인 (최대 {item.max_discount_percent}%),
              최저 {min.toLocaleString()}원
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={join}
              disabled={joining}
              className="flex-1 rounded-xl bg-[#3EB6F1] px-4 py-3 font-semibold text-black disabled:opacity-60"
            >
              {joining ? 'Joining...' : 'Join'}
            </button>
            <button
              onClick={fetchDetail}
              className="rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* 상세 소개 */}
        <div className="mt-6 rounded-2xl bg-white/5 p-5">
          <h2 className="text-lg font-semibold">About</h2>
          <div className="prose prose-invert mt-3 max-w-none">
            <ReactMarkdown>
              {item.detail_markdown ??
                'Admin에서 상세 소개 글/이미지를 추가해줘.'}
            </ReactMarkdown>
          </div>

          {(item.gallery_urls ?? []).length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(item.gallery_urls ?? []).map((url) => (
                <img key={url} src={url} alt="" className="w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1a1a1a] p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Share</div>
              <button onClick={() => setShareOpen(false)} className="rounded-lg bg-white/10 px-3 py-1">
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              <button onClick={copyLink} className="rounded-xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                Copy link
              </button>
              <button onClick={nativeShare} className="rounded-xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                Share (native)
              </button>
              <button onClick={kakaoShare} className="rounded-xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                KakaoTalk share
              </button>
              <div className="mt-2 text-xs text-white/60 break-all">
                {pageUrl}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
