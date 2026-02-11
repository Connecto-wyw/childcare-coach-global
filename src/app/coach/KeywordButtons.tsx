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

  const presets = ['🎯', '🧠', '🌱', '✨']
  const emoji = presets[idx] ?? '✨'
  return `${emoji} ${trimmed}`
}

function normalizeKw(s: string) {
  return (s ?? '')
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function buildMessageForKeyword(rawKw: string) {
  const kw = (rawKw ?? '').trim()
  const normalized = normalizeKw(kw)

  // ✅ 서버에서 강제 템플릿을 적용하기 위한 트리거 태그
  if (normalized === "korean moms' favorite picks") {
    // 태그 + 짧은 질문만 보냄 (강제 형식은 서버에서)
    return `[K_MOM_PICKS]\nKorean Moms’ Favorite Picks`
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
