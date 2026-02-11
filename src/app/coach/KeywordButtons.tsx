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

/**
 * ✅ A안: 특정 키워드 버튼을 눌렀을 때 "그대로 키워드만" 보내지 말고,
 *       원하는 답변 형식을 유도하는 프롬프트(질문)로 치환해서 ChatBox로 보낸다.
 *
 * - Korean Moms’ Favorite Picks 클릭 시:
 *   1) 한국 엄마들이 많이 쓰는 아이템 추천
 *   2) 아이와 함께 쓰는 뷰티 아이템 + 아이를 위한 아이템
 *   3) 마지막에 TEAM 메뉴 CTA
 */
function buildMessageForKeyword(rawKw: string) {
  const kw = (rawKw ?? '').trim()

  // 여러 표기(’ / ') 대응
  const normalized = kw
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()

  if (normalized === "korean moms' favorite picks") {
    return [
      `Please recommend popular items that Korean moms love and commonly use.`,
      ``,
      `Include BOTH categories:`,
      `1) Beauty items moms can use together with their kids (gentle, family-friendly).`,
      `2) Items for kids (daily essentials or helpful products).`,
      ``,
      `For each item, give:`,
      `- Item name`,
      `- 1 short reason why Korean moms like it`,
      `- A simple age note if relevant`,
      ``,
      `Recommend 8–10 items total.`,
      ``,
      `Finish with this call-to-action line (exactly as written):`,
      `"Visit our TEAM menu to discover Korean moms’ favorite items and buy great quality at a more reasonable price."`,
    ].join('\n')
  }

  // 기본: 기존처럼 키워드 그대로 전송
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
    // ✅ fallback 제거: 어드민 등록 없으면 아무것도 안 보여주고 싶으면 []로 두면 됨
    // (현재는 안전하게 최소 1개는 나오도록 유지하고 싶다면 기존 fallback을 살려도 됨)
    const fallback: string[] = []
    const source =
      keywords && keywords.length > 0 ? keywords : dbKeywords.length > 0 ? dbKeywords : fallback

    const deduped = Array.from(new Set(source.filter(Boolean)))
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
