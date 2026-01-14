'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/app/providers'

type Team = {
  id: string
  owner_id: string
  name: string
  description: string | null
  region: string | null
  created_at: string
}

type Activity = {
  id: string
  team_id: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export default function TeamDetailPage() {
  const { user, loading: authLoading } = useAuthUser()
  const params = useParams()
  const teamId = useMemo(() => String(params.teamId), [params.teamId])

  const [team, setTeam] = useState<Team | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)

    const teamRes = await supabase
      .from('teams')
      .select('id, owner_id, name, description, region, created_at')
      .eq('id', teamId)
      .single()

    const actRes = await supabase
      .from('team_activities')
      .select('id, team_id, title, description, starts_at, ends_at, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (teamRes.error) {
      console.error(teamRes.error)
      setTeam(null)
    } else {
      setTeam(teamRes.data as Team)
    }

    if (actRes.error) {
      console.error(actRes.error)
      setActivities([])
    } else {
      setActivities((actRes.data ?? []) as Activity[])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    if (!teamId) return
    fetchAll()
  }, [user, teamId])

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
        <Link href="/team" className="text-sm text-gray-400 hover:underline">
          ← TEAM 목록
        </Link>

        {loading ? (
          <p className="text-gray-400 mt-6">불러오는 중…</p>
        ) : !team ? (
          <p className="text-gray-400 mt-6">TEAM을 찾을 수 없습니다.</p>
        ) : (
          <>
            <h1 className="text-3xl font-bold mt-4">{team.name}</h1>
            <div className="text-sm text-gray-400 mt-2">
              {team.region ? `지역: ${team.region}` : '지역 미설정'}
            </div>

            {team.description ? (
              <div className="mt-4 text-gray-300 whitespace-pre-wrap">
                {team.description}
              </div>
            ) : null}

            <h2 className="text-2xl font-bold mt-10 mb-4">진행 중인 TEAM UP</h2>

            {activities.length === 0 ? (
              <p className="text-gray-400">진행 중인 활동이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="rounded-lg bg-[#222] p-4 border border-gray-700">
                    <Link
                      href={`/team/${teamId}/activities/${a.id}`}
                      className="text-lg text-[#3EB6F1] hover:underline"
                    >
                      {a.title}
                    </Link>

                    {a.description ? (
                      <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">
                        {a.description}
                      </div>
                    ) : null}

                    <div className="text-xs text-gray-400 mt-2">
                      {a.starts_at ? `시작: ${new Date(a.starts_at).toLocaleString()}` : ''}
                      {a.ends_at ? ` · 종료: ${new Date(a.ends_at).toLocaleString()}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  )
}
