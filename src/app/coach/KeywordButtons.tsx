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
  // 이미 이모지로 시작하면 그대로
  if (/^\p{Extended_Pictographic}/u.test(trimmed)) return trimmed

  const presets = ['🎯', '🧠', '🌱', '✨']
  const emoji = presets[idx] ?? '✨'
  return `${emoji} ${trimmed}`
}

// ✅ 비교를 “진짜 빡세게” 정규화: smart quote/공백/대소문자 모두 흡수
function normalizeKw(s: string) {
  return (s ?? '')
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// ✅ 앞에 붙는 이모지/변형자/ZWJ/공백/구분자까지 최대한 제거
function stripLeadingEmojiAndSpaces(s: string) {
  return (s ?? '')
    .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, '') // emoji + variation selector + zwj
    .replace(/^[\s\-–—•]+/g, '') // 공백/구분자
    .trim()
}

// ✅ “해당 키워드” 판별을 넓게 잡음 (이모지 포함/표기 흔들림 모두 커버)
function isKMomPicksKeyword(rawKw: string) {
  const n = normalizeKw(rawKw)
  const n2 = stripLeadingEmojiAndSpaces(n)

  // exact match(기존 후보)도 유지
  const candidates = [
    "korean moms' favorite picks",
    "korean mom's favorite picks",
    "korea moms' favorite picks",
    "korea mom's favorite picks",
  ]
  if (candidates.includes(n2)) return true

  // ✅ 포함(contains) 매칭: 표기 흔들려도 무조건 잡힘
  const hasKorea = n2.includes('korea') || n2.includes('korean')
  const hasMom =
    n2.includes("mom's") || n2.includes("moms'") || n2.includes('moms') || n2.includes('mom')
  const hasPicks = n2.includes('favorite picks') || (n2.includes('favorite') && n2.includes('picks'))

  return hasKorea && hasMom && hasPicks
}

function buildMessageForKeyword(rawKw: string) {
  const kw = (rawKw ?? '').trim()

  // ✅ 이 키워드면 무조건 태그를 붙여 서버에서 “고정문 모드”로 처리
  if (isKMomPicksKeyword(kw)) {
    return `💛 Korean Moms’ Favorite Picks`
  }

  return kw
}

export default function KeywordButtons({ keywords, className, max = 12 }: Props) {
  const supabase = useSupabase()

  const reduced = useReducedMotion()
  const [dbKeywords, setDbKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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
          const arr = (data as PopularKeywordRow[]).map((r) => r.keyword).filter(Boolean)
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
    const deduped = Array.from(new Set((source ?? []).filter(Boolean)))
    return deduped.slice(0, Math.max(1, max))
  }, [keywords, dbKeywords, max])

  const { list, row } = useMemo(() => {
    const stagger = reduced ? 0 : 0.14
    const duration = reduced ? 0 : 0.55
    const yFrom = 14

    const listVariants: Variants = {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: stagger } },
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
            key={kw}
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
