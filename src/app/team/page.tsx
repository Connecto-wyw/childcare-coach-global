'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const supabase = createClientComponentClient<Database>()

type TeamCard = {
  id: string
  name: string
  purpose: string | null
  participant_count: number
  tag1: string | null
  tag2: string | null
  image_url: string | null
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=60'

export default function TeamPage() {
  const [teams, setTeams] = useState<TeamCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase.rpc('get_teams_with_counts')

      if (error) {
        console.error(error)
        setTeams([])
      } else {
        setTeams((data ?? []) as TeamCard[])
      }

      setLoading(false)
    }

    fetchTeams()
  }, [])

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold">TEAM</h1>

        {loading ? (
          <p className="text-gray-400">불러오는 중…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-400">등록된 TEAM이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {teams.map((t) => (
              <Link
                key={t.id}
                href={`/team/${t.id}`}
                className="block overflow-hidden rounded-lg border border-gray-700 bg-[#222] transition hover:border-white/30"
              >
                <div className="aspect-[4/3] w-full bg-[#111]">
                  <img
                    src={t.image_url || FALLBACK_IMG}
                    alt={t.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4">
                  <div className="line-clamp-1 text-lg font-semibold">
                    {t.name}
                  </div>

                  <div className="mt-1 min-h-[40px] line-clamp-2 text-sm text-gray-300">
                    {t.purpose || '팀 목적이 아직 등록되지 않았습니다.'}
                  </div>

                  <div className="mt-3 text-sm text-gray-400">
                    참여자 {t.participant_count}명
                  </div>

                  <div className="mt-3 flex gap-2">
                    {t.tag1 && (
                      <span className="rounded-full bg-[#3EB6F1] px-2 py-1 text-xs text-black">
                        {t.tag1}
                      </span>
                    )}
                    {t.tag2 && (
                      <span className="rounded-full bg-[#3EB6F1] px-2 py-1 text-xs text-black">
                        {t.tag2}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
