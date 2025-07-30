'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Keyword = {
  id: string
  keyword: string
  order: number
}

export default function KeywordAdminPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  // DB에서 인기 키워드 불러오기
  const fetchKeywords = async () => {
    const { data, error } = await supabase
      .from('popular_keywords')
      .select('*')
      .order('order', { ascending: true })

    if (error) {
      console.error('❌ 키워드 불러오기 실패:', error.message)
    } else {
      setKeywords(data || [])
    }
  }

  // 새 키워드 추가
  const addKeyword = async () => {
    if (!newKeyword.trim()) return
    setLoading(true)
    const { error } = await supabase
      .from('popular_keywords')
      .insert([{ keyword: newKeyword, order: keywords.length }])
    setLoading(false)
    if (error) {
      console.error('❌ 키워드 추가 실패:', error.message)
    } else {
      setNewKeyword('')
      fetchKeywords() // 추가 후 목록 갱신
    }
  }

  // 키워드 삭제
  const deleteKeyword = async (id: string) => {
    const { error } = await supabase
      .from('popular_keywords')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('❌ 키워드 삭제 실패:', error.message)
    } else {
      fetchKeywords()
    }
  }

  useEffect(() => {
    fetchKeywords()
  }, [])

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">인기 검색 키워드 관리</h1>

      {/* 키워드 입력 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="flex-1 border p-2 rounded"
          placeholder="새 키워드 입력"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
        />
        <button
          onClick={addKeyword}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          추가
        </button>
      </div>

      {/* 키워드 목록 */}
      <ul className="space-y-2">
        {keywords.map((k) => (
          <li
            key={k.id}
            className="flex justify-between items-center border-b pb-2"
          >
            <span>{k.keyword}</span>
            <button
              onClick={() => deleteKeyword(k.id)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}