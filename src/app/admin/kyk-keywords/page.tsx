// src/app/admin/kyk-keywords/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthUser } from '@/app/providers'

type KykAdminKeywordRow = {
  mbti_type: string
  keywords: string[]
  updated_at: string
}

type ApiGetOk = {
  ok: boolean
  data: KykAdminKeywordRow[]
}

const ALL_MBTI_TYPES = [
  'intj', 'intp', 'entj', 'entp',
  'infj', 'infp', 'enfj', 'enfp',
  'istj', 'istp', 'estj', 'estp',
  'isfj', 'isfp', 'esfj', 'esfp',
]

export default function KykKeywordAdminPage() {
  const { user, loading } = useAuthUser() as any
  const authed = !!user

  const [rows, setRows] = useState<Record<string, string[]>>({})
  const [loadingList, setLoadingList] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchKeywords = useCallback(async () => {
    if (!authed) return

    setLoadingList(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/kyk-keywords', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!res.ok) {
        setErrorMsg(`API Error (GET): ${res.status}`)
        return
      }

      const json = (await res.json().catch(() => null)) as ApiGetOk | null
      const fetchedData = json?.data || []
      
      const newRows: Record<string, string[]> = {}
      
      // Initialize with default empty slots to prevent undefined
      ALL_MBTI_TYPES.forEach(mbti => {
        newRows[mbti] = ['', '', '']
      })
      
      // Override with DB data
      fetchedData.forEach(row => {
        const paddedKeywords = [...(row.keywords || [])]
        while (paddedKeywords.length < 3) paddedKeywords.push('')
        newRows[row.mbti_type] = paddedKeywords.slice(0, 3)
      })
      
      setRows(newRows)
    } catch (e: any) {
      setErrorMsg(`Network Error: ${e?.message ?? String(e)}`)
    } finally {
      setLoadingList(false)
    }
  }, [authed])

  useEffect(() => {
    if (!authed) return
    fetchKeywords()
  }, [authed, fetchKeywords])

  const handleKeywordChange = (mbti: string, index: number, value: string) => {
    setRows(prev => {
      const currentArr = [...(prev[mbti] || ['', '', ''])]
      currentArr[index] = value
      return { ...prev, [mbti]: currentArr }
    })
  }

  const saveMbtiKeywords = async (mbti: string) => {
    if (!authed) return
    
    setBusyId(mbti)
    setErrorMsg(null)
    setSuccessMsg(null)

    const keywordsToSave = (rows[mbti] || []).map(k => k.trim()).filter(Boolean)

    try {
      const res = await fetch('/api/kyk-keywords', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mbti_type: mbti, keywords: keywordsToSave }),
      })

      if (!res.ok) {
        setErrorMsg(`Update Failed (${mbti}): ${res.status}`)
        return
      }

      setSuccessMsg(`Successfully updated keywords for ${mbti.toUpperCase()}`)
      await fetchKeywords()
    } catch (e: any) {
      setErrorMsg(`Network Error: ${e?.message ?? String(e)}`)
    } finally {
      setBusyId(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">KYK Keywords (Admin)</h1>
          <div className="mt-4 p-4 rounded bg-[#2b2b2b] text-gray-200">Checking login…</div>
        </div>
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">KYK Keywords (Admin)</h1>
          <div className="mt-4 p-4 rounded bg-[#2b2b2b] text-gray-200">
            You must be logged in with an admin email to access this page.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">KYK Dynamic Result Keywords (Admin)</h1>
            <p className="text-sm text-gray-400">
              Set the 3 keywords (Translation Keys or Raw Text) that appear inside the KYK result card for each MBTI type.
            </p>
          </div>
          <button
            onClick={fetchKeywords}
            disabled={loadingList || !!busyId}
            className="px-4 py-2 bg-[#555] text-white rounded hover:opacity-90 text-sm disabled:opacity-60"
          >
            Refresh Data
          </button>
        </div>

        {errorMsg && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-100">{errorMsg}</div>}
        {successMsg && <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded text-sm text-green-100">{successMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {ALL_MBTI_TYPES.map((mbti) => {
            const currentKeywords = rows[mbti] || ['', '', '']
            const isSaving = busyId === mbti

            return (
              <div key={mbti} className="flex flex-col bg-[#3a3a3a] border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-[#3EB6F1]">{mbti.toUpperCase()}</h2>
                  <button
                    onClick={() => saveMbtiKeywords(mbti)}
                    disabled={isSaving || loadingList}
                    className="px-3 py-1 bg-[#3EB6F1] text-black text-sm font-semibold rounded hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {[0, 1, 2].map(idx => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={currentKeywords[idx]}
                        onChange={(e) => handleKeywordChange(mbti, idx, e.target.value)}
                        placeholder="e.g keyword_learning_routine"
                        className="flex-1 rounded border border-gray-600 bg-[#2b2b2b] p-2 text-sm text-[#eae3de] placeholder-gray-500 focus:outline-none focus:border-[#3EB6F1]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
