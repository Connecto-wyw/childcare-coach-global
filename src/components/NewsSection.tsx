'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const supabase = createClientComponentClient<Database>()


type NewsItem = {
  id: string
  title: string
  created_at: string
}

export default function NewsSection() {
  const [newsList, setNewsList] = useState<NewsItem[]>([])

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
      if (!error && data) {
        setNewsList(data)
      }
    }
    fetchNews()
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">NEWS</h2>
      {newsList.length === 0 ? (
        <p className="text-gray-500">등록된 뉴스가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {newsList.map((item) => (
            <li key={item.id} className="border-b pb-2">
              <Link
                href={`/news/${item.id}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {item.title}
              </Link>
              <p className="text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
