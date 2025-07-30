'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type NewsItem = {
  id: string
  title: string
  content?: string
  url?: string
  thumbnail?: string
  created_at?: string
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [thumbnail, setThumbnail] = useState('')

  // 뉴스 불러오기 (news 테이블 기준)
  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news')
      .select('id, title, content, url, thumbnail, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setNews(data)
  }

  useEffect(() => {
    fetchNews()
  }, [])

  // 뉴스 등록
  const addNews = async () => {
    if (!title) return
    const { error } = await supabase.from('news').insert([
      {
        title,
        content,
        url,
        thumbnail
        // created_at은 Supabase가 now()로 자동 채움
      },
    ])
    if (!error) {
      setTitle('')
      setContent('')
      setUrl('')
      setThumbnail('')
      fetchNews()
    }
  }

  // 뉴스 삭제
  const deleteNews = async (id: string) => {
    await supabase.from('news').delete().eq('id', id)
    fetchNews()
  }

  return (
    <main className="p-6 text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">육아 뉴스 관리</h1>

      {/* 뉴스 등록 폼 */}
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
        <input
          className="w-full p-2 border rounded"
          placeholder="썸네일 이미지 URL (선택)"
          value={thumbnail}
          onChange={(e) => setThumbnail(e.target.value)}
        />
        <button
          onClick={addNews}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:opacity-90"
        >
          뉴스 등록
        </button>
      </div>

      {/* 뉴스 리스트 */}
      <div className="space-y-4">
        {news.map((item) => (
          <div
            key={item.id}
            className="border p-4 rounded flex justify-between items-center"
          >
            <div>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="text-sm text-gray-600">
                {item.content?.slice(0, 80)}...
              </p>
            </div>
            <button
              onClick={() => deleteNews(item.id)}
              className="text-red-500 hover:underline"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
