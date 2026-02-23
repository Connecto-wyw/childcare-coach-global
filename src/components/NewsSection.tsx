'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/app/providers'
import type { Tables } from '@/lib/database.types'

type NewsPostRow = Tables<'news_posts'>

type NewsItem = Pick<NewsPostRow, 'id' | 'title' | 'created_at' | 'slug'>

export default function NewsSection() {
  const supabase = useSupabase()
  const [newsList, setNewsList] = useState<NewsItem[]>([])

  useEffect(() => {
    let alive = true

    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, created_at, slug')
        .not('slug', 'is', null)   // ✅ slug null 제외
        .neq('slug', '')           // ✅ slug 빈값 제외
        .order('created_at', { ascending: false })
        .limit(10)

      if (!alive) return

      if (error) {
        console.error('[news_posts] fetch error:', error)
        setNewsList([])
        return
      }

      // ✅ 혹시 공백 slug가 들어오면 2차 방어
      const cleaned = (data ?? []).filter((x) => (x.slug ?? '').trim().length > 0)
      setNewsList(cleaned as NewsItem[])
    }

    fetchNews()

    return () => {
      alive = false
    }
  }, [supabase])

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">NEWS</h2>

      {newsList.length === 0 ? (
        <p className="text-gray-500">등록된 뉴스가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {newsList.map((item) => {
            const href = `/news/${item.slug}` // ✅ fallback 제거
            const created = item.created_at ? new Date(item.created_at).toLocaleDateString() : ''

            return (
              <li key={item.id} className="border-b pb-2">
                <Link href={href} className="text-blue-600 hover:underline font-medium">
                  {item.title}
                </Link>
                <p className="text-sm text-gray-500">{created}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}