// src/app/coach/KeywordButtons.tsx (Client Component)
'use client'

import { useMemo, useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const supabase = createClientComponentClient<Database>()

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

export default function KeywordButtons({ keywords, className, max = 12 }: Props) {
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
  }, [keywords])

  const items = useMemo(() => {
    const fallback = ['Focus Boosters in Korea', 'Understanding ADHD', 'Gentle Discipline']
    const source =
      keywords && keywords.length > 0 ? keywords : dbKeywords.length > 0 ? dbKeywords : fallback
    const deduped = Array.from(new Set(source.filter(Boolean)))
    return deduped.slice(0, Math.max(1, max))
  }, [keywords, dbKeywords, max])

  const { list, row } = useMemo(() => {
    // ✅ PC/모바일 공통으로 느린 속도 고정
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
    window.dispatchEvent(new CustomEvent<string>(COACH_SET_MESSAGE_EVENT, { detail: kw }))
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
              'text-[#3497f3] text-[15px] font-medium',
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
