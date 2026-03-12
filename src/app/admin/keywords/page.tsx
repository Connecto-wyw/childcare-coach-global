// src/app/admin/keywords/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthUser } from '@/app/providers'
import TranslationInput, { I18nValues } from '@/components/admin/TranslationInput'

type Keyword = {
  id: string
  keyword: string
  keyword_i18n?: any
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
  data: Array<{ id: string; keyword: string; keyword_i18n: any; order: number | null | undefined }>
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

function normalize(rows: AdminGetOk['data']): Keyword[] {
  const mapped = rows.map((r, idx) => ({
    id: String(r.id),
    keyword: String(r.keyword),
    keyword_i18n: r.keyword_i18n,
    order: Number.isFinite(Number(r.order)) ? Number(r.order) : idx,
  }))
  mapped.sort((a, b) => a.order - b.order)
  return mapped
}

export default function KeywordAdminPage() {
  const { user, loading } = useAuthUser() as any
  const authed = !!user

  const [keywords, setKeywords] = useState<Keyword[]>([])
  
  const [newKeyword, setNewKeyword] = useState('')
  const [newKeywordI18n, setNewKeywordI18n] = useState<I18nValues | null>(null)
  const [rawNewI18nData, setRawNewI18nData] = useState<{ keyword?: any }>({})

  const [loadingList, setLoadingList] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // edit state
  const [editId, setEditId] = useState<string | null>(null)
  
  const [editKeyword, setEditKeyword] = useState('')
  const [editKeywordI18n, setEditKeywordI18n] = useState<I18nValues | null>(null)
  const [rawEditI18nData, setRawEditI18nData] = useState<{ keyword?: any }>({})
  
  const [editOrder, setEditOrder] = useState<string>('')

  const canInteract = authed && !loadingList && !busyId

  const fetchKeywords = useCallback(async () => {
    if (!authed) return

    setLoadingList(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/keywords', {
        method: 'GET',
        cache: 'no-store',
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
    } finally {
      setLoadingList(false)
    }
  }, [authed])

  useEffect(() => {
    if (!authed) return
    fetchKeywords()
  }, [authed, fetchKeywords])

  async function addKeyword() {
    if (!authed) return
    const value = newKeyword.trim()
    if (!value) return

    setLoadingList(true)
    setErrorMsg(null)

    const nextOrder = keywords.length > 0 ? Math.max(...keywords.map((k) => k.order)) + 1 : 0

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keyword: value, keyword_i18n: newKeywordI18n, order: nextOrder }),
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
      setNewKeywordI18n(null)
      setRawNewI18nData({})
      await fetchKeywords()
    } catch (e: any) {
      setErrorMsg(`네트워크 오류(ADD): ${e?.message ?? String(e)}`)
    } finally {
      setLoadingList(false)
    }
  }

  function startEdit(k: Keyword) {
    setEditId(k.id)
    setEditKeyword(k.keyword)
    setEditKeywordI18n(k.keyword_i18n ?? null)
    setRawEditI18nData({ keyword: k.keyword_i18n })
    setEditOrder(String(k.order))
    setErrorMsg(null)
  }

  function cancelEdit() {
    setEditId(null)
    setEditKeyword('')
    setEditKeywordI18n(null)
    setRawEditI18nData({})
    setEditOrder('')
  }

  async function saveEdit() {
    if (!authed || !editId) return

    const kw = editKeyword.trim()
    const ord = Number(editOrder)

    if (!kw) return setErrorMsg('키워드 비어있음.')
    if (Number.isNaN(ord)) return setErrorMsg('order 숫자여야 함.')

    setBusyId(editId)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/keywords', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: editId, keyword: editKeyword.trim(), keyword_i18n: editKeywordI18n, order: ord }),
      })

      if (!res.ok) {
        const err = await readError(res)
        setErrorMsg(
          `서버 API 오류(SAVE): ${err.status} ${err.code}${err.detail ? ` (${err.detail})` : ''}${
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
    if (!authed) return

    setBusyId(id)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/keywords?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <div className="mt-4 p-4 rounded bg-[#2b2b2b] text-gray-200">Checking login…</div>
        </div>
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">
            이제 Admin UUID 로그인 방식 제거했고, <b>로그인된 계정</b> + <b>허용된 이메일</b>만 접근 가능.
          </p>
          <div className="mt-4 p-4 rounded bg-[#2b2b2b] text-gray-200">
            먼저 상단 메뉴에서 로그인 해.
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
              Logged in as <span className="text-gray-200">{user?.email ?? user?.id ?? 'unknown'}</span>
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            addKeyword()
          }}
          className="mt-4"
        >
          <TranslationInput
            label="New Keyword (English)"
            baseString={newKeyword}
            i18nData={rawNewI18nData.keyword}
            disabled={!canInteract || loadingList}
            onChange={(en, localized) => {
              setNewKeyword(en)
              setNewKeywordI18n(localized)
            }}
          />
          <button
            type="submit"
            disabled={!canInteract || !newKeyword.trim() || loadingList}
            className="w-full mt-2 rounded bg-[#3EB6F1] px-4 py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            + Add
          </button>
        </form>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={fetchKeywords}
            disabled={loadingList || !!busyId}
            className="px-3 py-1 bg-[#555] text-white rounded hover:opacity-90 text-sm disabled:opacity-60"
          >
            Refresh
          </button>
          <span className="text-xs text-gray-400">목록 로딩은 GET /api/keywords (로그인+허용이메일 필요)</span>
        </div>

        {errorMsg && <div className="mb-4 text-sm text-red-300 whitespace-pre-wrap">{errorMsg}</div>}

        <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a]">
          {keywords.length === 0 ? (
            <div className="p-4 text-sm text-gray-300">{loadingList ? 'Loading…' : 'No keywords yet.'}</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {keywords.map((k) => {
                const isEditing = editId === k.id
                return (
                  <li key={k.id} className="p-3 flex items-center gap-3">
                    <span className="w-14 text-sm text-gray-300">#{k.order}</span>

                    {isEditing ? (
                      // EDIT MODE
                      <div className="flex flex-col gap-3">
                        <TranslationInput
                          label="Edit Keyword"
                          baseString={editKeyword}
                          i18nData={rawEditI18nData.keyword}
                          disabled={!canInteract || loadingList}
                          onChange={(en, localized) => {
                            setEditKeyword(en)
                            setEditKeywordI18n(localized)
                          }}
                        />

                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-white/70 w-24">Order Index</label>
                          <input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(e.target.value)}
                            className="w-24 rounded bg-white/10 px-3 py-2 text-white focus:outline-none"
                            placeholder="Order"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={!canInteract || loadingList}
                            className="rounded bg-[#3EB6F1] px-4 py-1.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={!canInteract || loadingList}
                            className="rounded bg-white/10 px-4 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 break-words">{k.keyword}</span>
                        <button
                          onClick={() => startEdit(k)}
                          disabled={loadingList || !!busyId}
                          className="px-3 py-1 bg-[#666] text-white rounded hover:opacity-90 text-sm disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteKeyword(k.id)}
                          disabled={busyId === k.id || loadingList}
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
