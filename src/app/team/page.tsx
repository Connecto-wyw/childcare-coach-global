// src/app/team/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
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

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

function buildTeamImageUrl(image_url: string | null) {
  if (!image_url) return null
  const raw = String(image_url).trim()
  if (!raw) return null

  // 이미 전체 URL이면 그대로
  if (/^https?:\/\//i.test(raw)) return raw

  // 경로(team/xxx.png)이면 Supabase public URL로 조합
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  if (!supabaseUrl) return raw

  const path = raw.replace(/^\//, '')
  return `${stripTrailingSlash(supabaseUrl)}/storage/v1/object/public/team-images/${path}`
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

  const mapped = useMemo(() => {
    return teams.map((t) => ({
      ...t,
      imageSrc: buildTeamImageUrl(t.image_url) || FALLBACK_IMG,
      tags: [t.tag1, t.tag2].filter((x): x is string => Boolean(x && String(x).trim())),
      joined: Number.isFinite(t.participant_count) ? t.participant_count : 0,
    }))
  }, [teams])

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-2 text-[44px] font-semibold leading-tight">Team</h1>
        <p className="mb-8 text-[15px] font-medium text-[#b4b4b4]">
          Join small challenges and share routines together.
        </p>

        {loading ? (
          <p className="text-[13px] font-medium text-[#b4b4b4]">Loading…</p>
        ) : mapped.length === 0 ? (
          <p className="text-[13px] font-medium text-[#b4b4b4]">No teams available.</p>
        ) : (
          // ✅ PC: 2개씩 / 모바일: 1개
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {mapped.map((t) => (
              <Link
                key={t.id}
                href={`/team/${t.id}`}
                className={[
                  'block overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white',
                  'shadow-[0_1px_0_rgba(0,0,0,0.02)]',
                  'transition hover:border-[#dcdcdc]',
                ].join(' ')}
              >
                {/* 이미지 */}
                <div className="w-full overflow-hidden">
                  <img
                    src={t.imageSrc}
                    alt={t.name}
                    className="h-[220px] w-full object-cover md:h-[260px]"
                  />
                </div>

                <div className="p-6">
                  {/* 타이틀 + Joined */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[28px] font-semibold text-[#0e0e0e]">
                        {t.name}
                      </div>
                    </div>

                    <div
                      className={[
                        'shrink-0 rounded-full bg-[#f3f3f3] px-4 py-2',
                        'text-[13px] font-semibold text-[#b4b4b4]',
                        'flex items-center gap-2',
                      ].join(' ')}
                      aria-label={`Joined ${t.joined}`}
                      title={`Joined ${t.joined}`}
                    >
                      <span className="inline-block h-4 w-4 rounded-full bg-[#d9d9d9]" />
                      Joined {t.joined}
                    </div>
                  </div>

                  {/* 설명 */}
                  <div className="mt-3 line-clamp-3 text-[15px] font-medium leading-relaxed text-[#8f8f8f]">
                    {t.purpose || 'No description yet.'}
                  </div>

                  {/* 태그 (색상 들어간 pill) */}
                  {t.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className={[
                            'rounded-lg border border-[#d8e9ff] bg-[#f0f7fd]',
                            'px-5 py-2 text-[15px] font-semibold text-[#3497f3]',
                          ].join(' ')}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Join now 버튼 */}
                  <button
                    type="button"
                    className={[
                      'mt-6 w-full h-[72px]',
                      'bg-[#1e1e1e] text-white',
                      'text-[28px] font-semibold',
                      'rounded-none',
                    ].join(' ')}
                  >
                    Join now
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
