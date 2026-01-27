// src/app/team/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

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

function safeText(s: unknown) {
  return String(s ?? '').trim()
}

function buildImg(src: string | null) {
  const raw = safeText(src)
  return raw || FALLBACK_IMG
}

function Tag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center h-9 px-5 rounded border border-[#dbe9ff] bg-white text-[#2a7de1] text-[18px] font-medium">
      {children}
    </span>
  )
}

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
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[56px] leading-none font-bold">Team</h1>
        <p className="mt-3 text-[16px] text-[#b4b4b4]">
          Join small challenges and share routines together.
        </p>

        <div className="mt-10">
          {loading ? (
            <p className="text-[15px] font-medium text-[#b4b4b4]">Loading…</p>
          ) : teams.length === 0 ? (
            <p className="text-[15px] font-medium text-[#b4b4b4]">No active teams.</p>
          ) : (
            // ✅ 모바일: 1열 유지 / PC(>=lg): 2열 고정
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {teams.map((t) => {
                const img = buildImg(t.image_url)
                const tags = [t.tag1, t.tag2].filter((x): x is string => Boolean(safeText(x)))
                const purpose = safeText(t.purpose) || 'Team purpose is not available yet.'

                return (
                  <article key={t.id} className="bg-[#f0f7fd] p-4 sm:p-6">
                    <div className="bg-white rounded-[22px] border border-[#e9eef5] overflow-hidden shadow-sm h-full flex flex-col">
                      {/* Image */}
                      <div className="w-full bg-[#d9d9d9]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={t.name} className="w-full h-auto block object-cover" />
                      </div>

                      {/* Content */}
                      <div className="p-6 sm:p-7 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="text-[28px] sm:text-[32px] leading-tight font-semibold line-clamp-2">
                            {t.name}
                          </h2>

                          <div className="shrink-0">
                            <span className="inline-flex items-center h-9 px-4 rounded-full bg-[#f2f2f2] text-[#8a8a8a] text-[15px] font-medium">
                              Joined {t.participant_count}
                            </span>
                          </div>
                        </div>

                        <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-[#6f6f6f] line-clamp-3">
                          {purpose}
                        </p>

                        {tags.length > 0 && (
                          <div className="mt-6 flex flex-wrap gap-3">
                            {tags.map((tag) => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                          </div>
                        )}

                        {/* CTA (항상 하단) */}
                        <div className="mt-8">
                          <Link
                            href={`/team/${t.id}`}
                            className="block w-full text-center bg-[#1e1e1e] text-white text-[24px] sm:text-[28px] font-semibold py-5 sm:py-6"
                          >
                            Join now
                          </Link>

                          <div className="mt-4">
                            <Link
                              href={`/team/${t.id}`}
                              className="text-[#3497f3] text-[16px] font-medium hover:underline underline-offset-2"
                            >
                              Open →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
