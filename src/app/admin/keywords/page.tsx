// src/app/admin/keywords/page.tsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'

type Keyword = {
  id: string
  keyword: string
  order: number
}

export default function KeywordAdminPage() {
  const user = useUser()
  const supabase = useSupabaseClient()

  const isSignedIn = !!user?.email
  const isAllowed = useMemo(
    () => (user?.email || '').toLowerCase().endsWith('@connecto-wyw.com'),
    [user?.email]
  )

  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchKeywords = useCallback(async () => {
    const { data, error } = await supabase
      .from('popular_keywords')
      .select('id, keyword, "order"')
      .order('order', { ascending: true })

    if (error) {
      console.error('Load failed:', error.message)
      setKeywords([])
      setErrorMsg('로드 실패: 권한 또는 네트워크 확인')
      return
    }
    setErrorMsg(null)
    setKeywords((data as Keyword[]) ?? [])
  }, [supabase])

  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  async function addKeyword() {
    if (!isAllowed) return
    const value = newKeyword.trim()
    if (!value) return
    setLoading(true)
    setErrorMsg(null)

    const nextOrder =
      keywords.length > 0 ? Math.max(...keywords.map(k => k.order)) + 1 : 0

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: user!.email,
          keyword: value,
          order: nextOrder,
        }),
      })

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      const apiErr =
        typeof json['error'] === 'string' ? (json['error'] as string) : undefined

      if (!res.ok) {
        console.error('API error:', apiErr ?? res.statusText)
        setErrorMsg('추가 실패: 서버 API 오류')
        setLoading(false)
        return
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Fetch failed:', msg)
      setErrorMsg('추가 실패: 네트워크 오류')
      setLoading(false)
      return
    }

    setLoading(false)
    setNewKeyword('')
    fetchKeywords()
  }

  async function deleteKeyword(id: string) {
    if (!isAllowed) return
    setBusyId(id)
    setErrorMsg(null)

    const { error } = await supabase
      .from('popular_keywords')
      .delete()
      .eq('id', id)

    setBusyId(null)

    if (error) {
      console.error('Delete failed:', error.message)
      setErrorMsg('삭제 실패: RLS 또는 권한 확인')
      return
    }
    fetchKeywords()
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">
            로그인 필요. @connecto-wyw.com 계정으로 로그인하세요.
          </p>
        </div>
      </main>
    )
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">접근 차단</h1>
          <p className="mt-2 text-sm text-gray-300">
            이 페이지는 @connecto-wyw.com 도메인 사용자만 사용할 수 있습니다.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Popular Keywords (Admin)</h1>

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

        {errorMsg && <div className="mb-4 text-sm text-red-300">{errorMsg}</div>}

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
