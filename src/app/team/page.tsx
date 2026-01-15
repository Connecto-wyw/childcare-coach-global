'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TeamCard = {
  id: string
  name: string
  purpose: string | null
  participant_count: number
  tag1: string | null
  tag2: string | null
  image_url: string | null
  created_at: string
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=60'

export default function TeamPage() {
  const [teams, setTeams] = useState<TeamCard[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTeams = async () => {
    setLoading(true)

    // ✅ RPC로 “팀 + 참여자수”를 DB에서 계산해서 내려받음
    const { data, error } = await supabase.rpc('get_teams_with_counts')

    if (error) {
      console.error('get_teams_with_counts error', error)
      setTeams([])
      setLoading(false)
      return
    }

    setTeams((data ?? []) as TeamCard[])
    setLoading(false)
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">TEAM</h1>

        {loading ? (
          <p className="text-gray-400">불러오는 중…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-400">등록된 TEAM이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-[#222] border border-gray-700 rounded-lg overflow-hidden"
              >
                <div className="w-full aspect-[4/3] bg-[#111]">
                  <img
                    src={t.image_url || FALLBACK_IMG}
                    alt={t.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="p-4">
                  <div className="text-lg font-semibold text-[#eae3de] line-clamp-1">
                    {t.name}
                  </div>

                  <div className="text-sm text-gray-300 mt-1 line-clamp-2 min-h-[40px]">
                    {t.purpose || '팀 목적이 아직 등록되지 않았습니다.'}
                  </div>

                  <div className="text-sm text-gray-400 mt-3">
                    참여자 {t.participant_count}명
                  </div>

                  <div className="flex gap-2 mt-3">
                    {t.tag1 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#3EB6F1] text-black">
                        {t.tag1}
                      </span>
                    ) : null}
                    {t.tag2 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#3EB6F1] text-black">
                        {t.tag2}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
