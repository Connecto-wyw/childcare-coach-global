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
  // ✅ App Router에서 가장 안정적인 클라이언트 생성 방식
  const supabase = useMemo(() => createClientComponentClient(), [])

  // ---- auth state (직접 관리) ----
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const isSignedIn = !!userEmail
  const isAllowed = useMemo(
    () => (userEmail || '').toLowerCase().endsWith(ADMIN_DOMAIN),
    [userEmail]
  )

  // ---- magic link ----
  const [emailInput, setEmailInput] = useState('')
  const [sendingLink, setSendingLink] = useState(false)
  const [sentMsg, setSentMsg] = useState<string | null>(null)

  // ---- data ----
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ✅ 초기 유저 로딩 + 로그인 상태 변화 구독
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

  // ✅ 관리자 허용일 때만 로드
  useEffect(() => {
    if (!isSignedIn) return
    if (!isAllowed) return
    fetchKeywords()
  }, [isSignedIn, isAllowed, fetchKeywords])

  async function sendMagicLink() {
    const email = emailInput.trim().toLowerCase()
    setErrorMsg(null)
    setSentMsg(null)

    if (!email) {
      setErrorMsg('이메일을 입력해 주세요.')
      return
    }
    if (!email.endsWith(ADMIN_DOMAIN)) {
      setErrorMsg(`관리자 이메일만 허용됩니다. (${ADMIN_DOMAIN})`)
      return
    }

    setSendingLink(true)
    try {
      // ✅ supabase-js v2: signInWithOtp
      // ✅ 혹시 v1이면 signIn({ email })로 폴백
      const authAny = supabase.auth as any
      if (typeof authAny?.signInWithOtp === 'function') {
        const { error } = await authAny.signInWithOtp({
          email,
          options: {
            emailRedirectTo:
              typeof window !== 'undefined' ? window.location.href : undefined,
          },
        })
        if (error) {
          setErrorMsg(`링크 발송 실패: ${error.message}`)
          return
        }
      } else if (typeof authAny?.signIn === 'function') {
        const { error } = await authAny.signIn({
          email,
        })
        if (error) {
          setErrorMsg(`링크 발송 실패: ${error.message}`)
          return
        }
      } else {
        setErrorMsg('Auth 클라이언트가 초기화되지 않았어. providers 설정을 확인해줘.')
        return
      }

      setSentMsg('메일로 로그인 링크를 보냈어. 받은편지함/스팸함 확인해줘.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(`네트워크 오류: ${msg}`)
    } finally {
      setSendingLink(false)
    }
  }

  async function signOut() {
    setErrorMsg(null)
    await supabase.auth.signOut()
  }

  // -------- actions --------
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
          email: userEmail,
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(`네트워크 오류: ${msg}`)
      return
    } finally {
      setLoading(false)
    }

    setNewKeyword('')
    fetchKeywords()
  }

  async function deleteKeyword(id: string) {
    if (!isAllowed) return
    setBusyId(id)
    setErrorMsg(null)

    const { error } = await supabase.from('popular_keywords').delete().eq('id', id)

    setBusyId(null)

    if (error) {
      console.error('Delete failed:', error.message)
      setErrorMsg('삭제 실패: RLS 또는 권한 확인')
      return
    }
    fetchKeywords()
  }
  // -------------------------

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">
            관리자 전용 페이지. {ADMIN_DOMAIN} 이메일로 매직링크 로그인해.
          </p>

          <div className="mt-6 max-w-lg">
            <label className="block text-sm text-gray-300 mb-2">Admin email</label>
            <div className="flex gap-2">
              <input
                type="email"
                className="flex-1 rounded border border-gray-600 bg-[#2b2b2b] p-2 text-[#eae3de] placeholder-gray-400"
                placeholder={`example${ADMIN_DOMAIN}`}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !sendingLink) sendMagicLink()
                }}
              />
              <button
                onClick={sendMagicLink}
                disabled={sendingLink}
                className="px-4 py-2 bg-[#3EB6F1] text-black rounded disabled:opacity-50"
              >
                {sendingLink ? 'Sending…' : 'Send link'}
              </button>
            </div>

            {sentMsg && <div className="mt-3 text-sm text-green-200">{sentMsg}</div>}
            {errorMsg && <div className="mt-3 text-sm text-red-300">{errorMsg}</div>}
          </div>
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

          {errorMsg && <div className="mt-4 text-sm text-red-300">{errorMsg}</div>}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
            <p className="mt-1 text-xs text-gray-400">
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
