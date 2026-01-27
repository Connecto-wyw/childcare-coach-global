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
    <main className="min-h-screen bg-white text-[#0e0e0e] pb-28">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* ✅ coach 톤: 큰 타이틀 + 서브카피 */}
        <section className="mb-10">
          <h1 className="text-[48px] font-semibold tracking-tight leading-none">Team</h1>
          <p className="mt-3 text-[15px] font-medium text-[#b4b4b4]">
            Join small challenges and share routines together.
          </p>
        </section>

        {/* ✅ coach 톤: 연한 블루 섹션 박스 */}
        <section className="bg-[#f0f7fd] p-4 md:p-6">
          {loading ? (
            <p className="text-[13px] font-medium text-[#b4b4b4]">Loading…</p>
          ) : teams.length === 0 ? (
            <p className="text-[13px] font-medium text-[#b4b4b4]">No teams available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {teams.map((t) => {
                const tags = [t.tag1, t.tag2].filter((x): x is string => Boolean(x && x.trim()))
                const img = t.image_url || FALLBACK_IMG

                return (
                  <Link
                    key={t.id}
                    href={`/team/${t.id}`}
                    className={[
                      'block',
                      'overflow-hidden',
                      'rounded-2xl',
                      'border border-[#eeeeee]',
                      'bg-white',
                      'transition',
                      'hover:bg-black/[0.02]',
                    ].join(' ')}
                  >
                    {/* 이미지 */}
                    <div className="aspect-[4/3] w-full bg-[#f7f7f7]">
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={t.name} className="h-full w-full object-cover" />
                    </div>

                    {/* 본문 */}
                    <div className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-[20px] font-semibold leading-snug">
                            {t.name}
                          </div>

                          <div className="mt-2 min-h-[40px] line-clamp-2 text-[13px] font-medium text-[#b4b4b4]">
                            {t.purpose || 'No description yet.'}
                          </div>
                        </div>

                        {/* 참여자 배지: coach 톤 */}
                        <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full bg-black/5 text-[13px] font-medium text-[#1e1e1e]">
                          Joined {t.participant_count}
                        </span>
                      </div>

                      {/* 태그: coach 블루(#3497f3) + pill */}
                      {tags.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-[#eeeeee] text-[13px] font-medium text-[#3497f3]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* CTA 느낌(원하면 제거 가능): 카드 내부 링크 강조 */}
                      <div className="mt-5">
                        <span className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2">
                          Open →
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
