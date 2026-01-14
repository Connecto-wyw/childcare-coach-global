'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/app/providers'
import type { User } from '@supabase/supabase-js'

type Team = {
  id: string
  owner_id: string
  name: string
  description: string | null
  region: string | null
  created_at: string
}

function getUserLabel(user: User) {
  const md = (user.user_metadata ?? {}) as Record<string, any>
  return (
    md.full_name ||
    md.name ||
    (user.email ? String(user.email).split('@')[0] : null) ||
    (user.id ? String(user.id).slice(0, 8) : 'user')
  )
}

export default function TeamListPage() {
  const { user, loading: authLoading } = useAuthUser()

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  const userLabel = useMemo(() => (user ? getUserLabel(user) : ''), [user])

  const fetchTeams = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('teams')
      .select('id, owner_id, name, description, region, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('fetchTeams error', error)
      setTeams([])
      setLoading(false)
      return
    }

    setTeams((data ?? []) as Team[])
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    fetchTeams()
  }, [user])

  const joinTeam = async (teamId: string) => {
    if (!user) return
    setJoining(teamId)

    const { error } = await supabase.from('team_members').insert([
      {
        team_id: teamId,
        user_id: user.id,
        role: 'member',
      },
    ])

    setJoining(null)

    if (error) {
      alert(error.message)
      console.error(error)
      return
    }

    alert('TEAM 가입 완료')
  }

  // auth 로딩 중이면 가드 화면을 먼저 띄우지 말고 로딩 표시
  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center px-4">
        <p className="text-gray-400">로그인 상태 확인 중…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#222] border border-gray-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold">TEAM</h1>
          <p className="text-gray-300 mt-2">TEAM 기능은 로그인 후 사용 가능해.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl font-bold">TEAM</h1>
          <div className="text-sm text-gray-400">로그인: {userLabel}</div>
        </div>

        {loading ? (
          <p className="text-gray-400 mt-6">불러오는 중…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-400 mt-6">등록된 TEAM이 없습니다.</p>
        ) : (
          <ul className="space-y-4 mt-6">
            {teams.map((t) => (
              <li key={t.id} className="rounded-lg bg-[#222] p-4 border border-gray-700">
                <Link href={`/team/${t.id}`} className="text-lg text-[#3EB6F1] hover:underline">
                  {t.name}
                </Link>

                <div className="text-sm text-gray-400 mt-1">
                  {t.region ? `지역: ${t.region}` : '지역 미설정'}
                </div>

                {t.description ? (
                  <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">
                    {t.description}
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => joinTeam(t.id)}
                    disabled={joining === t.id}
                    className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-90 disabled:opacity-50"
                  >
                    {joining === t.id ? '가입 중…' : 'TEAM 가입'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
