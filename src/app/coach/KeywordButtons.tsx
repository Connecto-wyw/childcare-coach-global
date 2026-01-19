// src/app/coach/KeywordButtons.tsx (Client Component)
'use client'

import { useMemo, useCallback, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const supabase = createClientComponentClient<Database>()

export const COACH_SET_MESSAGE_EVENT = 'coach:setMessage'

type Props = {
  /** 외부에서 직접 키워드 배열을 넘기면 이 값을 우선 사용 */
  keywords?: string[]
  className?: string
  max?: number
}

type PopularKeywordRow = {
  keyword: string
  order: number
}

export default function KeywordButtons({ keywords, className, max = 12 }: Props) {
  const [dbKeywords, setDbKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (keywords && keywords.length > 0) return // 프롭이 있으면 DB 조회 생략

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
    const fallback = [
      'Could my child have ADHD?',
      'Fun things to do at home this weekend',
      'How to handle a child’s fever',
      'How to discipline a child who won’t listen',
    ]
    const source =
      keywords && keywords.length > 0 ? keywords : dbKeywords.length > 0 ? dbKeywords : fallback
    const deduped = Array.from(new Set(source.filter(Boolean)))
    return deduped.slice(0, Math.max(1, max))
  }, [keywords, dbKeywords, max])

  const fill = useCallback((kw: string) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent<string>(COACH_SET_MESSAGE_EVENT, { detail: kw }))
  }, [])

  return (
    <div className={className ?? 'flex flex-col gap-3'}>
      {items.map((kw) => (
        <button
          key={kw}
          type="button"
          onClick={() => fill(kw)}
          className={[
            // ✅ 스샷/스펙 기준
            'w-full text-left',
            'bg-[#f0f7fd]',
            'px-4 py-3',
            'text-[#3497f3] text-[15px] font-medium',
            'transition hover:opacity-90',
          ].join(' ')}
          aria-label={`Select keyword ${kw}`}
          disabled={loading && dbKeywords.length === 0 && (!keywords || keywords.length === 0)}
        >
          {kw}
        </button>
      ))}
    </div>
  )
}
