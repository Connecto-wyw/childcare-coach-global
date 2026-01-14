'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/app/providers'
import type { User } from '@supabase/supabase-js'

type Activity = {
  id: string
  team_id: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

type Participant = {
  id: string
  activity_id: string
  user_id: string
  nickname: string | null
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

export default function ActivityDetailPage() {
  const { user, loading: authLoading } = useAuthUser()
  const params = useParams()

  const teamId = useMemo(() => String(params.teamId), [params.teamId])
  const activityId = useMemo(() => String(params.activityId), [params.activityId])

  const [activity, setActivity] = useState<Activity | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const fetchAll = async () => {
    setLoading(true)

    const actRes = await supabase
      .from('team_activities')
      .select('id, team_id, title, description, starts_at, ends_at, created_at')
      .eq('id', activityId)
      .single()

    const pRes = await supabase
      .from('activity_participants')
      .select('id, activity_id, user_id, nickname, created_at')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })

    if (actRes.error) {
      console.error(actRes.error)
      setActivity(null)
    } else {
      setActivity(actRes.data as Activity)
    }

    if (pRes.error) {
      console.error(pRes.error)
      setParticipants([])
    } else {
      setParticipants((pRes.data ?? []) as Participant[])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    if (!activityId) return
    fetchAll()
  }, [user, activityId])

  const join = async () => {
    if (!user) return
    setJoining(true)

    const nickname = String(getUserLabel(user))

    const { error } = await supabase.from('activity_participants').insert([
      {
        activity_id: activityId,
        user_id: user.id,
        nickname,
      },
    ])

    setJoining(false)

    if (error) {
      alert(error.message)
      console.error(error)
      return
    }

    fetchAll()
  }

  const copyShareLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (!url) return
    await navigator.clipboard.writeText(url)
    alert('공유 링크를 복사했어.')
  }

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
          <h1 className="text-2xl font-bold">TEAM UP</h1>
          <p className="text-gray-300 mt-2">활동 참여는 로그인 후 가능해.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={`/team/${teamId}`} className="text-sm text-gray-400 hover:underline">
          ← TEAM 상세로
        </Link>

        {loading ? (
          <p className="text-gray-400 mt-6">불러오는 중…</p>
        ) : !activity ? (
          <p className="text-gray-400 mt-6">활동을 찾을 수 없습니다.</p>
        ) : (
          <>
            <h1 className="text-3xl font-bold mt-4">{activity.title}</h1>

            {activity.description ? (
              <div className="mt-4 text-gray-300 whitespace-pre-wrap">
                {activity.description}
              </div>
            ) : null}

            <div className="text-sm text-gray-400 mt-3">
              {activity.starts_at ? `시작: ${new Date(activity.starts_at).toLocaleString()}` : ''}
              {activity.ends_at ? ` · 종료: ${new Date(activity.ends_at).toLocaleString()}` : ''}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-[#3EB6F1] text-black rounded hover:opacity-90"
              >
                공유
              </button>

              <button
                onClick={join}
                disabled={joining}
                className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {joining ? '참여 중…' : '참여하기'}
              </button>
            </div>

            <h2 className="text-2xl font-bold mt-10 mb-3">
              참여자 ({participants.length})
            </h2>

            <div className="rounded-lg bg-[#222] p-4 border border-gray-700">
              <div className="space-y-2">
                {participants.length === 0 ? (
                  <p className="text-gray-400">아직 참여자가 없습니다.</p>
                ) : (
                  participants.map((p) => (
                    <div key={p.id} className="text-sm text-gray-200">
                      {p.nickname ?? p.user_id.slice(0, 8)}
                      <span className="text-xs text-gray-500">
                        {' '}
                        · {new Date(p.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
