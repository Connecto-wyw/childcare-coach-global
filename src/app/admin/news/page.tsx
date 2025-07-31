'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsItem = {
  id: string
  title: string
  content?: string
  url?: string
  created_at?: string
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news')
      .select('id, title, content, url, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setNews(data)
  }

  useEffect(() => {
    fetchNews()
  }, [])

  const addNews = async () => {
    if (!title) return
    try {
      const res = await fetch('https://hrvbdyusoybsviiuboac.supabase.co/rest/v1/news', {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          title,
          content,
          url,
        }),
      })
      if (!res.ok) {
        const errorText = await res.text()
        console.error('뉴스 등록 실패:', errorText)
        return
      }
      const data = await res.json()
      console.log('등록된 뉴스:', data)
      setTitle('')
      setContent('')
      setUrl('')
      fetchNews()
    } catch (err) {
      console.error('뉴스 등록 중 에러:', err)
    }
  }

  const deleteNews = async (id: string) => {
    await supabase.from('news').delete().eq('id', id)
    fetchNews()
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <main className="p-6 text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">육아 뉴스 관리</h1>

      <div className="mb-6 space-y-3">
        <input
          className="w-full p-2 border rounded"
          placeholder="뉴스 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full p-2 border rounded"
          placeholder="뉴스 내용 (선택)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="원본 링크 (선택)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={addNews}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:opacity-90"
        >
          뉴스 등록
        </button>
      </div>

      <div className="space-y-4">
        {news.map((item) => (
          <div
            key={item.id}
            className="border p-4 rounded flex flex-col"
          >
            <h2
              className="text-lg font-semibold cursor-pointer"
              onClick={() => toggleExpand(item.id)}
            >
              {item.title}
            </h2>

            {expandedId === item.id && (
              <div className="mt-2 text-gray-700">
                {item.content ?? '내용이 없습니다.'}
                {item.url && (
                  <p className="mt-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      원문 보기
                    </a>
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => deleteNews(item.id)}
              className="self-end mt-2 text-red-500 hover:underline"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
