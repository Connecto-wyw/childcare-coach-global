// src/app/admin/keywords/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Keyword = {
  id: string
  keyword: string
  order: number
}

const ADMIN_DOMAIN = '@connecto-wyw.com'

export default function KeywordAdminPage() {
  const supabase = useMemo(() => createClientComponentClient(), [])

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const isSignedIn = !!userEmail
  const isAllowed = useMemo(
    () => (userEmail || '').toLowerCase().endsWith(ADMIN_DOMAIN),
    [userEmail]
  )

  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUserEmail(data.user?.email ?? null)
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

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
    if (!isSignedIn) return
    if (!isAllowed) return
    fetchKeywords()
  }, [isSignedIn, isAllowed, fetchKeywords])

  async function signOut() {
    setErrorMsg(null)
    await supabase.auth.signOut()
  }

  async function addKeyword() {
    if (!isAllowed) return
    const value = newKeyword.trim()
    if (!value) return

    setLoading(true)
    setErrorMsg(null)

    const nextOrder =
      keywords.length > 0 ? Math.max(...keywords.map((k) => k.order)) + 1 : 0

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          keyword: value,
          order: nextOrder,
        }),
      })

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        const code = (json['error'] as string) || res.statusText
        const detail = typeof json['detail'] === 'string' ? ` (${json['detail']})` : ''
        setErrorMsg(`서버 API 오류: ${code}${detail}`)
        return
      }

      setNewKeyword('')
      await fetchKeywords()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(`네트워크 오류: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // ✅ 삭제를 API(서비스 롤)로 통일
  async function deleteKeyword(id: string) {
    if (!isAllowed) return
    setBusyId(id)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/keywords?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        const code = (json['error'] as string) || res.statusText
        const detail = typeof json['detail'] === 'string' ? ` (${json['detail']})` : ''
        setErrorMsg(`삭제 API 오류: ${code}${detail}`)
        return
      }

      await fetchKeywords()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(`네트워크 오류: ${msg}`)
    } finally {
      setBusyId(null)
    }
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">로그인 필요. {ADMIN_DOMAIN} 계정으로 로그인해.</p>
        </div>
      </main>
    )
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">접근 차단</h1>
            <button
              onClick={signOut}
              className="px-3 py-1 bg-[#3EB6F1] text-black rounded hover:opacity-90 text-sm"
            >
              Sign out
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-300">
            이 페이지는 {ADMIN_DOMAIN} 도메인 사용자만 사용할 수 있어.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            현재 로그인: <span className="text-gray-200">{userEmail}</span>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Popular Keywords (Admin)</h1>
            <p className="text-xs text-gray-400">
              Signed in as <span className="text-gray-200">{userEmail}</span>
            </p>
          </div>
          <button
            onClick={signOut}
            className="px-3 py-1 bg-[#3EB6F1] text-black rounded hover:opacity-90 text-sm"
          >
            Sign out
          </button>
        </div>

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
