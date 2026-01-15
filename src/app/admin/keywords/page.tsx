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

type ApiErr = {
  status: number
  code: string
  detail?: string
  raw?: string
}

type KeywordsApiOk = {
  data: Array<{ id: string; keyword: string; order: number | null | undefined }>
}

async function readError(res: Response): Promise<ApiErr> {
  const status = res.status
  const raw = await res.text().catch(() => '')
  let json: any = null
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    json = null
  }

  const code =
    (json && typeof json.error === 'string' && json.error) ||
    res.statusText ||
    'unknown_error'

  const detail = json && typeof json.detail === 'string' ? json.detail : undefined
  const rawShort = raw ? raw.slice(0, 300) : ''

  return { status, code, detail, raw: rawShort }
}

function normalizeKeywords(rows: KeywordsApiOk['data']): Keyword[] {
  const mapped = rows.map((r, idx) => ({
    id: String(r.id),
    keyword: String(r.keyword),
    order: Number.isFinite(Number(r.order)) ? Number(r.order) : idx,
  }))
  mapped.sort((a, b) => a.order - b.order)
  return mapped
}

export default function KeywordAdminPage() {
  const supabase = useMemo(() => createClientComponentClient(), [])

  // ---- auth state ----
  const [authChecked, setAuthChecked] = useState(false)
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

  // ✅ access token (Authorization 헤더용)
  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [supabase])

  // ✅ 세션 초기 로드 + 변경 구독
  useEffect(() => {
    let mounted = true

    async function init() {
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error) console.warn('getUser error:', error.message)
      setUserEmail(data.user?.email ?? null)
      setAuthChecked(true)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
      setAuthChecked(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // ✅ 목록은 항상 API로 조회 + Authorization 헤더 포함
  const fetchKeywords = useCallback(async () => {
    setErrorMsg(null)

    try {
      const token = await getAccessToken()

      const res = await fetch('/api/keywords', {
        method: 'GET',
        cache: 'no-store',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      })

      if (!res.ok) {
        const err = await readError(res)
        setKeywords([])
        setErrorMsg(
          `서버 API 오류(GET): ${err.status} ${err.code}${err.detail ? ` (${err.detail})` : ''}${
            err.raw ? ` | raw: ${err.raw}` : ''
          }`
        )
        return
      }

      const json = (await res.json().catch(() => null)) as KeywordsApiOk | null
      const rows = json && Array.isArray((json as any).data) ? (json as any).data : []
      setKeywords(normalizeKeywords(rows))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setKeywords([])
      setErrorMsg(`네트워크 오류(GET): ${msg}`)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (!authChecked) return
    if (!isSignedIn) return
    if (!isAllowed) return
    fetchKeywords()
  }, [authChecked, isSignedIn, isAllowed, fetchKeywords])

  async function signOut() {
    setErrorMsg(null)
    await supabase.auth.signOut()
  }

  async function sendMagicLink() {
    const email = emailInput.trim().toLowerCase()
    setErrorMsg(null)
    setSentMsg(null)

    if (!email) {
      setErrorMsg('이메일을 입력해줘.')
      return
    }
    if (!email.endsWith(ADMIN_DOMAIN)) {
      setErrorMsg(`관리자 이메일만 허용돼. (${ADMIN_DOMAIN})`)
      return
    }

    setSendingLink(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      })

      if (error) {
        setErrorMsg(`링크 발송 실패: ${error.message}`)
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

  async function addKeyword() {
    if (!isAllowed) return
    const value = newKeyword.trim()
    if (!value) return

    setLoading(true)
    setErrorMsg(null)

    const nextOrder =
      keywords.length > 0 ? Math.max(...keywords.map((k) => k.order)) + 1 : 0

    try {
      const token = await getAccessToken()

      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ keyword: value, order: nextOrder }),
      })

      if (!res.ok) {
        const err = await readError(res)
        setErrorMsg(
          `서버 API 오류(ADD): ${err.status} ${err.code}${err.detail ? ` (${err.detail})` : ''}${
            err.raw ? ` | raw: ${err.raw}` : ''
          }`
        )
        return
      }

      setNewKeyword('')
      await fetchKeywords()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(`네트워크 오류(ADD): ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  async function deleteKeyword(id: string) {
    if (!isAllowed) return
    setBusyId(id)
    setErrorMsg(null)

    try {
      const token = await getAccessToken()

      const res = await fetch(`/api/keywords?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      })

      if (!res.ok) {
        const err = await readError(res)
        setErrorMsg(
          `서버 API 오류(DEL): ${err.status} ${err.code}${err.detail ? ` (${err.detail})` : ''}${
            err.raw ? ` | raw: ${err.raw}` : ''
          }`
        )
        return
      }

      await fetchKeywords()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(`네트워크 오류(DEL): ${msg}`)
    } finally {
      setBusyId(null)
    }
  }

  // ✅ 세션 체크 중
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">세션 확인 중…</p>
        </div>
      </main>
    )
  }

  // ✅ 미로그인
  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">
            로그인 필요. {ADMIN_DOMAIN} 계정으로 매직링크 로그인해.
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
            {errorMsg && <div className="mt-3 text-sm text-red-300 whitespace-pre-wrap">{errorMsg}</div>}
          </div>
        </div>
      </main>
    )
  }

  // ✅ 로그인했지만 도메인 불일치
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

          {errorMsg && <div className="mt-4 text-sm text-red-300 whitespace-pre-wrap">{errorMsg}</div>}
        </div>
      </main>
    )
  }

  // ✅ 관리자 UI
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

        {errorMsg && <div className="mb-4 text-sm text-red-300 whitespace-pre-wrap">{errorMsg}</div>}

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

        <div className="mt-4 text-xs text-gray-400">
          목록 로딩은 <code className="text-gray-200">GET /api/keywords</code>로 고정됨 (RLS/세션 꼬임 방지)
        </div>
      </div>
    </main>
  )
}
