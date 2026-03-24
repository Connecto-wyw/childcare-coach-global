'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthUser } from '@/app/providers'
import Link from 'next/link'

type TeamRow = {
  id: string
  name: string
  image_url: string | null
  tag1: string | null
  tag2: string | null
  is_active: boolean
  is_featured: boolean
}

export default function FeaturedTeamsAdminPage() {
  const { user, loading } = useAuthUser() as any
  const authed = !!user

  const [teams, setTeams] = useState<TeamRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)

  const fetchTeams = useCallback(async () => {
    if (!authed) return
    setLoadingData(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/featured-teams', { cache: 'no-store' })
      if (!res.ok) { setErrorMsg(`Error ${res.status}`); return }
      const json = await res.json()
      const rows: TeamRow[] = json.data ?? []
      setTeams(rows)
      setSelected(new Set(rows.filter((r) => r.is_featured).map((r) => r.id)))
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Network error')
    } finally {
      setLoadingData(false)
    }
  }, [authed])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setErrorMsg(null)
    setSavedMsg(false)
    try {
      const res = await fetch('/api/admin/featured-teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ featuredIds: [...selected] }),
      })
      if (!res.ok) { setErrorMsg(`Save failed: ${res.status}`); return }
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
      await fetchTeams()
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] flex items-center justify-center">
        <p>Checking login…</p>
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold mb-4">Featured Teams (Admin)</h1>
          <div className="p-4 rounded bg-[#2b2b2b] text-gray-200">먼저 상단 메뉴에서 로그인 해.</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-200 mb-1 block">← Admin</Link>
            <h1 className="text-2xl font-bold">Featured Teams (Admin)</h1>
            <p className="text-sm text-gray-400 mt-1">이번주 추천팀을 선택하세요. 체크한 팀이 HOME 화면에 표시됩니다.</p>
          </div>
          <button
            onClick={save}
            disabled={saving || loadingData}
            className="px-5 py-2 bg-[#3EB6F1] text-black font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {savedMsg && (
          <div className="mb-4 px-4 py-2 bg-emerald-800 text-emerald-200 rounded-lg text-sm">✓ 저장됐습니다.</div>
        )}
        {errorMsg && (
          <div className="mb-4 px-4 py-2 bg-red-900 text-red-200 rounded-lg text-sm">{errorMsg}</div>
        )}

        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {selected.size}개 선택됨 · 전체 {teams.length}개 팀
          </span>
          <button
            onClick={fetchTeams}
            disabled={loadingData}
            className="px-3 py-1 bg-[#555] text-white rounded text-xs hover:opacity-90 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {/* 팀 목록 */}
        <div className="rounded-2xl border border-gray-700 bg-[#2a2a2a] overflow-hidden">
          {loadingData ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
          ) : teams.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">팀이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {teams.map((team) => {
                const isFeatured = selected.has(team.id)
                return (
                  <li
                    key={team.id}
                    onClick={() => toggle(team.id)}
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                      isFeatured ? 'bg-[#1a3a4a]' : 'hover:bg-[#333]'
                    }`}
                  >
                    {/* 체크박스 */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isFeatured ? 'bg-[#3EB6F1] border-[#3EB6F1]' : 'border-gray-500'
                    }`}>
                      {isFeatured && (
                        <svg viewBox="0 0 12 12" className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>

                    {/* 이미지 */}
                    <div className="w-12 h-12 rounded-lg bg-[#444] overflow-hidden shrink-0">
                      {team.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.image_url} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#555]" />
                      )}
                    </div>

                    {/* 팀 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate">{team.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${team.is_active ? 'bg-emerald-900 text-emerald-300' : 'bg-gray-700 text-gray-400'}`}>
                          {team.is_active ? 'active' : 'inactive'}
                        </span>
                        {team.tag1 && <span className="text-[11px] text-gray-400">{team.tag1}</span>}
                        {team.tag2 && <span className="text-[11px] text-gray-400">{team.tag2}</span>}
                      </div>
                    </div>

                    {isFeatured && (
                      <span className="text-[11px] font-semibold text-[#3EB6F1] shrink-0">추천팀 ★</span>
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
