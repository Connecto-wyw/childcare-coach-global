// src/app/team-items/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/app/providers'
import type { Database } from '@/lib/database.types'
import { calcTeamItemPricing } from '@/lib/teamPricing'

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

type TeamItemRow = Database['public']['Tables']['team_items']['Row']

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=60'

export default function TeamPage() {
  const supabase = useSupabase()

  const [teams, setTeams] = useState<TeamCard[]>([])
  const [teamItems, setTeamItems] = useState<TeamItemRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)

    const [{ data: items, error: itemsError }, { data: teamsData, error: teamsError }] =
      await Promise.all([
        supabase
          .from('team_items')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_teams_with_counts'),
      ])

    if (itemsError) {
      console.error('team_items error', itemsError)
      setTeamItems([])
    } else {
      setTeamItems(items ?? [])
    }

    if (teamsError) {
      console.error('get_teams_with_counts error', teamsError)
      setTeams([])
    } else {
      setTeams((teamsData ?? []) as TeamCard[])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">TEAM</h1>

        {loading ? (
          <p className="text-gray-400">불러오는 중…</p>
        ) : (
          <>
            {/* ✅ TEAM ITEMS (배너/프로그램) */}
            <section>
              <div className="flex items-end justify-between">
                <h2 className="text-xl font-semibold">TEAM ITEMS</h2>
                <Link href="/team-itemss" className="text-sm text-white/70 hover:text-white">
                  전체보기 →
                </Link>
              </div>

              {teamItems.length === 0 ? (
                <p className="text-gray-400 mt-3">등록된 TEAM ITEM이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {teamItems.map((it) => (
                    <Link
                      key={it.id}
                      href={`/team-itemss/${it.slug}`}
                      className="block bg-[#222] border border-gray-700 rounded-lg overflow-hidden hover:border-white/30 hover:bg-white/5 transition cursor-pointer"
                    >
                      <div className="w-full aspect-[4/3] bg-[#111]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.cover_image_url || FALLBACK_IMG}
                          alt={it.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      <div className="p-4">
                        <div className="text-lg font-semibold line-clamp-1">{it.title}</div>
                        <div className="text-sm text-gray-300 mt-1 line-clamp-2 min-h-[40px]">
                          {it.description || ''}
                        </div>

                        <div className="flex gap-2 mt-3 flex-wrap">
                          {(it.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 rounded-full bg-[#3EB6F1] text-black"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* 가격은 상세에서 정확히 표시(여기서는 베이스만) */}
                        <div className="text-sm text-white/70 mt-3">
                          시작가 {Math.round(it.base_price).toLocaleString()}원
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ✅ 기존 TEAM(커뮤니티) */}
            <section className="mt-10">
              <h2 className="text-xl font-semibold">COMMUNITY TEAMS</h2>

              {teams.length === 0 ? (
                <p className="text-gray-400 mt-3">등록된 TEAM이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {teams.map((t) => (
                    <Link
                      key={t.id}
                      href={`/team/${t.id}`}
                      className="block bg-[#222] border border-gray-700 rounded-lg overflow-hidden hover:border-white/30 hover:bg-white/5 transition cursor-pointer"
                    >
                      <div className="w-full aspect-[4/3] bg-[#111]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.image_url || FALLBACK_IMG}
                          alt={t.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      <div className="p-4">
                        <div className="text-lg font-semibold line-clamp-1">{t.name}</div>

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
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
