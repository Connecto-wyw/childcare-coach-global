// src/app/coach/KeywordButtons.tsx (Client Component)
'use client'

import { useMemo, useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useSupabase } from '@/app/providers'

export const COACH_SET_MESSAGE_EVENT = 'coach:setMessage'

type Props = {
  keywords?: string[]
  className?: string
  max?: number
}

type PopularKeywordRow = {
  keyword: string
  order: number
}

function withEmoji(label: string, idx: number) {
  const trimmed = (label ?? '').trim()
  if (/^\p{Extended_Pictographic}/u.test(trimmed)) return trimmed

  // ✅ 여기서 1번 키워드(한국맘 픽)는 쇼핑/아이템 느낌으로 더 강하게
  // (문구 자체에 이모지가 이미 들어오면 그대로 유지됨)
  const presets = ['🛍️', '🧠', '🌱', '✨']
  const emoji = presets[idx] ?? '✨'
  return `${emoji} ${trimmed}`
}

function normalizeKw(s: string) {
  return (s ?? '')
    .trim()
    .replace(/[’‘]/g, "'") // smart quote -> '
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// ✅ 서버에서 "고정 텍스트 100% 그대로 출력" 트리거
const K_MOM_TAG = '[K_MOM_PICKS]'

// ✅ 키워드 매칭을 넉넉하게(따옴표/복수형/철자 흔들림)
function isKMomPicksKeyword(normalized: string) {
  const candidates = new Set([
    "korean moms' favorite picks",
    "korean mom's favorite picks",
    'korean moms favorite picks',
    'korean mom favorite picks',
    "korea moms' favorite picks",
    "korea mom's favorite picks",
    'korea moms favorite picks',
    'korea mom favorite picks',
  ])
  return candidates.has(normalized)
}

function buildMessageForKeyword(rawKw: string) {
  const kw = (rawKw ?? '').trim()
  const normalized = normalizeKw(kw)

  // ✅ 이 키워드를 누르면 서버가 OpenAI를 호출하지 않고
  // ✅ "사용자가 준 고정 본문"을 1글자도 안 바꾸고 그대로 반환하도록 트리거
  if (isKMomPicksKeyword(normalized)) {
    // 서버에서 태그만 감지하면 되므로, question은 짧게 유지
    return `${K_MOM_TAG}\nKorean Moms’ Favorite Picks`
  }

  return kw
}

export default function KeywordButtons({ keywords, className, max = 12 }: Props) {
  const supabase = useSupabase()

  const reduced = useReducedMotion()
  const [dbKeywords, setDbKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // ✅ 서버에서 이미 keywords를 내려주면 DB 조회 안 함
    if (keywords && keywords.length > 0) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('popular_keywords')
          .select('keyword,"order"')
          .order('order', { ascending: true })

        if (!error && data) {
          const arr = (data as PopularKeywordRow[])
            .map((r) => (r?.keyword ?? '').trim())
            .filter(Boolean)
          if (!cancelled) setDbKeywords(arr)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [keywords, supabase])

  const items = useMemo(() => {
    const source = keywords && keywords.length > 0 ? keywords : dbKeywords
    const deduped = Array.from(new Set((source ?? []).map((x) => (x ?? '').trim()).filter(Boolean)))
    return deduped.slice(0, Math.max(1, max))
  }, [keywords, dbKeywords, max])

  const { list, row } = useMemo(() => {
    const stagger = reduced ? 0 : 0.14
    const duration = reduced ? 0 : 0.55
    const yFrom = 14

    const listVariants: Variants = {
      hidden: { opacity: 1 },
      show: {
        opacity: 1,
        transition: { staggerChildren: stagger },
      },
    }

    const rowVariants: Variants = {
      hidden: { opacity: 0, y: yFrom },
      show: {
        opacity: 1,
        y: 0,
        transition: reduced ? { duration: 0 } : { duration, ease: 'easeOut' },
      },
    }

    return { list: listVariants, row: rowVariants }
  }, [reduced])

  const fill = useCallback((kw: string) => {
    if (typeof window === 'undefined') return
    const message = buildMessageForKeyword(kw)
    window.dispatchEvent(new CustomEvent<string>(COACH_SET_MESSAGE_EVENT, { detail: message }))
  }, [])

  return (
    <motion.div
      variants={list}
      initial="hidden"
      animate="show"
      className={className ?? 'flex flex-col gap-3'}
    >
      {items.slice(0, 3).map((kw, i) => {
        const label = withEmoji(kw, i)
        return (
          <motion.button
            key={`${kw}-${i}`}
            variants={row}
            type="button"
            onClick={() => fill(kw)}
            className={[
              'w-full text-left',
              'bg-[#f0f7fd]',
              'px-4 py-3',
              'text-[#3497f3] text-[18px] font-medium',
              'transition hover:opacity-90',
            ].join(' ')}
            aria-label={`Select keyword ${kw}`}
            disabled={loading && dbKeywords.length === 0 && (!keywords || keywords.length === 0)}
          >
            {label}
          </motion.button>
        )
      })}
    </motion.div>
  )
}
