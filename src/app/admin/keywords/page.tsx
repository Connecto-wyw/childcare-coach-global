// src/app/admin/keywords/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Keyword = {
  id: string
  keyword: string
  order: number
}

type ApiErr = {
  status: number
  code: string
  detail?: string
  raw?: string
}

type AdminGetOk = {
  ok: boolean
  data: Array<{ id: string; keyword: string; order: number | null | undefined }>
}

const STORAGE_KEY = 'admin_uuid_keywords'

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

function normalize(rows: AdminGetOk['data']): Keyword[] {
  const mapped = rows.map((r, idx) => ({
    id: String(r.id),
    keyword: String(r.keyword),
    order: Number.isFinite(Number(r.order)) ? Number(r.order) : idx,
  }))
  mapped.sort((a, b) => a.order - b.order)
  return mapped
}

export default function KeywordAdminPage() {
  const [adminUuid, setAdminUuid] = useState('')
  const [savedUuid, setSavedUuid] = useState<string | null>(null)

  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editKeyword, setEditKeyword] = useState('')
  const [editOrder, setEditOrder] = useState<string>('')

  useEffect(() => {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    setSavedUuid(v && v.trim() ? v.trim() : null)
  }, [])

  const isLoggedIn = !!savedUuid

  function logout() {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
    setSavedUuid(null)
    setAdminUuid('')
    setKeywords([])
    setErrorMsg(null)
    setEditId(null)
  }

  function login() {
    const v = adminUuid.trim()
    if (!v) {
      setErrorMsg('Admin UUID 입력해.')
      return
    }
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, v)
    setSavedUuid(v)
    setErrorMsg(null)
  }

  const fetchKeywords = useCallback(async () => {
    if (!savedUuid) return
    setErrorMsg(null)

    try {
      const res = await fetch('/api/keywords', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'x-admin-uuid': savedUuid },
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

      const json = (await res.json().catch(() => null)) as AdminGetOk | null
      const rows = json && Array.isArray((json as any).data) ? (json as any).data : []
      setKeywords(normalize(rows))
    } catch (e: any) {
      setKeywords([])
      setErrorMsg(`네트워크 오류(GET): ${e?.message ?? String(e)}`)
    }
  }, [savedUuid])

  useEffect(() => {
    if (!savedUuid) return
    fetchKeywords()
  }, [savedUuid, fetchKeywords])

  async function addKeyword() {
    if (!savedUuid) return
    const value = newKeyword.trim()
    if (!value) return

    setLoading(true)
    setErrorMsg(null)

    const nextOrder = keywords.length > 0 ? Math.max(...keywords.map((k) => k.order)) + 1 : 0

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-uuid': savedUuid,
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
    } catch (e: any) {
      setErrorMsg(`네트워크 오류(ADD): ${e?.message ?? String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(k: Keyword) {
    setEditId(k.id)
    setEditKeyword(k.keyword)
    setEditOrder(String(k.order))
    setErrorMsg(null)
  }

  function cancelEdit() {
    setEditId(null)
    setEditKeyword('')
    setEditOrder('')
  }

  async function saveEdit() {
    if (!savedUuid || !editId) return
    const kw = editKeyword.trim()
    const ord = Number(editOrder)

    if (!kw) {
      setErrorMsg('키워드 비어있음.')
      return
    }
    if (Number.isNaN(ord)) {
      setErrorMsg('order 숫자여야 함.')
      return
    }

    setBusyId(editId)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/keywords', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-admin-uuid': savedUuid,
        },
        body: JSON.stringify({ id: editId, keyword: kw, order: ord }),
      })

      if (!res.ok) {
        const err = await readError(res)
        setErrorMsg(
          `서버 API 오류(UPDATE): ${err.status} ${err.code}${err.detail ? ` (${err.detail})` : ''}${
            err.raw ? ` | raw: ${err.raw}` : ''
          }`
        )
        return
      }

      cancelEdit()
      await fetchKeywords()
    } catch (e: any) {
      setErrorMsg(`네트워크 오류(UPDATE): ${e?.message ?? String(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteKeyword(id: string) {
    if (!savedUuid) return
    setBusyId(id)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/keywords?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-uuid': savedUuid },
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
    } catch (e: any) {
      setErrorMsg(`네트워크 오류(DEL): ${e?.message ?? String(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  // --- UI ---
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">
            매직링크 로그인 없음. Admin UUID로만 접근.
          </p>

          <div className="mt-6 max-w-lg">
            <label className="block text-sm text-gray-300 mb-2">Admin UUID</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-gray-600 bg-[#2b2b2b] p-2 text-[#eae3de] placeholder-gray-400"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={adminUuid}
                onChange={(e) => setAdminUuid(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') login()
                }}
              />
              <button
                onClick={login}
                className="px-4 py-2 bg-[#3EB6F1] text-black rounded hover:opacity-90"
              >
                Login
              </button>
            </div>

            {errorMsg && <div className="mt-3 text-sm text-red-300 whitespace-pre-wrap">{errorMsg}</div>}
            <div className="mt-4 text-xs text-gray-400">
              서버는 <code className="text-gray-200">ADMIN_UUIDS</code> 환경변수에 등록된 UUID만 허용.
            </div>
          </div>
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
              Admin UUID: <span className="text-gray-200">{savedUuid?.slice(0, 8)}…</span>
            </p>
          </div>
          <button
            onClick={logout}
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

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={fetchKeywords}
            className="px-3 py-1 bg-[#555] text-white rounded hover:opacity-90 text-sm"
          >
            Refresh
          </button>
          <span className="text-xs text-gray-400">목록 로딩은 GET /api/keywords (x-admin-uuid 헤더 필요)</span>
        </div>

        {errorMsg && <div className="mb-4 text-sm text-red-300 whitespace-pre-wrap">{errorMsg}</div>}

        <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a]">
          {keywords.length === 0 ? (
            <div className="p-4 text-sm text-gray-300">No keywords yet.</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {keywords.map((k) => {
                const isEditing = editId === k.id
                return (
                  <li key={k.id} className="p-3 flex items-center gap-3">
                    <span className="w-14 text-sm text-gray-300">#{k.order}</span>

                    {isEditing ? (
                      <>
                        <input
                          className="flex-1 rounded border border-gray-600 bg-[#2b2b2b] p-2 text-[#eae3de]"
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                        />
                        <input
                          className="w-24 rounded border border-gray-600 bg-[#2b2b2b] p-2 text-[#eae3de]"
                          value={editOrder}
                          onChange={(e) => setEditOrder(e.target.value)}
                        />
                        <button
                          onClick={saveEdit}
                          disabled={busyId === k.id}
                          className="px-3 py-1 bg-[#3EB6F1] text-black rounded hover:opacity-90 text-sm disabled:opacity-50"
                        >
                          {busyId === k.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-[#666] text-white rounded hover:opacity-90 text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 break-words">{k.keyword}</span>
                        <button
                          onClick={() => startEdit(k)}
                          className="px-3 py-1 bg-[#666] text-white rounded hover:opacity-90 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteKeyword(k.id)}
                          disabled={busyId === k.id}
                          className="px-3 py-1 bg-[#8a1a1d] text-white rounded hover:opacity-90 text-sm disabled:opacity-50"
                        >
                          {busyId === k.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
