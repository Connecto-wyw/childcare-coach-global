// src/app/admin/keywords/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

type Keyword = {
  id: string
  keyword: string
  order: number
}

export default function KeywordAdminPage() {
  const supabase = useSupabaseClient()
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchKeywords = useCallback(async () => {
    setErrorMsg(null)
    const { data, error } = await supabase
      .from('popular_keywords')
      .select('id, keyword, "order"')
      .order('order', { ascending: true })

    if (error) {
      console.error('Load failed:', error.message)
      setErrorMsg('로드 실패: 권한 또는 네트워크 확인')
      setKeywords([])
      return
    }
    setKeywords((data as Keyword[]) ?? [])
  }, [supabase])

  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  async function addKeyword() {
    const value = newKeyword.trim()
    if (!value) return
    setLoading(true)
    setErrorMsg(null)

    // 다음 order 계산
    const nextOrder =
      keywords.length > 0 ? Math.max(...keywords.map(k => k.order)) + 1 : 0

    // 낙관적 UI 업데이트
    const tempId = `temp-${Date.now()}`
    const optimistic: Keyword = { id: tempId, keyword: value, order: nextOrder }
    setKeywords(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('popular_keywords')
      .insert([{ keyword: value, order: nextOrder }])
      .select('id, keyword, "order"')
      .single()

    setLoading(false)
    setNewKeyword('')

    if (error) {
      console.error('Insert failed:', error.message)
      setErrorMsg('추가 실패: RLS 권한(anon insert) 확인')
      // 롤백
      setKeywords(prev => prev.filter(k => k.id !== tempId))
      return
    }

    // temp 항목을 실제 데이터로 교체
    setKeywords(prev =>
      prev.map(k => (k.id === tempId ? (data as Keyword) : k))
    )
  }

  async function deleteKeyword(id: string) {
    setBusyId(id)
    setErrorMsg(null)

    // 낙관적 제거
    const prev = keywords
    setKeywords(prev.filter(k => k.id !== id))

    const { error } = await supabase
      .from('popular_keywords')
      .delete()
      .eq('id', id)

    setBusyId(null)

    if (error) {
      console.error('Delete failed:', error.message)
      setErrorMsg('삭제 실패: RLS 권한(anon delete) 확인')
      // 롤백
      setKeywords(prev)
      return
    }
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Popular Keywords (Admin-Lite)</h1>
        <p className="text-sm text-gray-300 mb-6">
          로그인 없이 사용. Supabase RLS에서 anon 권한이 허용되어야 작동.
        </p>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 rounded border border-gray-600 bg-[#2b2b2b] p-2 text-[#eae3de] placeholder-gray-400"
            placeholder="Enter a new keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newKeyword.trim() && !loading) addKeyword()
            }}
          />
          <button
            onClick={addKeyword}
            disabled={loading || !newKeyword.trim()}
            className="px-4 py-2 bg-[#3EB6F1] text-black rounded disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 text-sm text-red-300">{errorMsg}</div>
        )}

        <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a]">
          {keywords.length === 0 ? (
            <div className="p-4 text-sm text-gray-300">No keywords yet.</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {keywords.map((k) => (
                <li key={k.id} className="p-3 flex items-center gap-3">
                  <span className="w-10 text-sm text-gray-300">#{k.order}</span>
                  <span className="flex-1 break-words">{k.keyword}</span>
                  <button
                    onClick={() => deleteKeyword(k.id)}
                    disabled={busyId === k.id}
                    className="px-3 py-1 bg-[#8a1a1d] text-white rounded hover:opacity-90 text-sm disabled:opacity-50"
                  >
                    {busyId === k.id ? 'Deleting…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
