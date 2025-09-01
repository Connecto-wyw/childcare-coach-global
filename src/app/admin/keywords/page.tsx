// src/app/admin/keywords/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'

type Keyword = {
  id: string
  keyword: string
  order: number
}

export default function KeywordAdminPage() {
  const user = useUser()
  const supabase = useSupabaseClient()

  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchKeywords() {
    const { data, error } = await supabase
      .from('popular_keywords')
      .select('id, keyword, "order"')
      .order('order', { ascending: true })

    if (error) {
      console.error('Load failed:', error.message)
      setKeywords([])
      return
    }
    setKeywords((data as Keyword[]) ?? [])
  }

  useEffect(() => {
    fetchKeywords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addKeyword() {
    const value = newKeyword.trim()
    if (!value) return
    setLoading(true)

    const nextOrder =
      keywords.length > 0 ? Math.max(...keywords.map(k => k.order)) + 1 : 0

    const { error } = await supabase
      .from('popular_keywords')
      .insert([{ keyword: value, order: nextOrder }])

    setLoading(false)
    if (error) {
      console.error('Insert failed:', error.message)
      return
    }
    setNewKeyword('')
    fetchKeywords()
  }

  async function deleteKeyword(id: string) {
    const { error } = await supabase
      .from('popular_keywords')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error.message)
      return
    }
    fetchKeywords()
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">Popular Keywords (Admin)</h1>
          <p className="mt-2 text-sm text-gray-300">Please sign in to manage keywords.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Popular Keywords (Admin)</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            className="flex-1 rounded border border-gray-600 bg-[#2b2b2b] p-2 text-[#eae3de] placeholder-gray-400"
            placeholder="Enter a new keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
          />
          <button
            onClick={addKeyword}
            disabled={loading || !newKeyword.trim()}
            className="px-4 py-2 bg-[#3EB6F1] text-black rounded disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a]">
          {keywords.length === 0 ? (
            <div className="p-4 text-sm text-gray-300">No keywords yet.</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {keywords.map((k) => (
                <li key={k.id} className="p-3 flex items-center gap-3">
                  <span className="w-10 text-sm text-gray-300">#{k.order}</span>
                  <span className="flex-1">{k.keyword}</span>
                  <button
                    onClick={() => deleteKeyword(k.id)}
                    className="px-3 py-1 bg-[#8a1a1d] text-white rounded hover:opacity-90 text-sm"
                  >
                    Delete
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
