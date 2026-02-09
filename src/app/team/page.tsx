'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const supabase = createClientComponentClient<Database>()

/**
 * ✅ RPC(get_teams_with_counts) “원본 결과” 타입
 * - 스샷 기준 컬럼들(id, name, purpose, tag1, tag2, image_url, created_at)
 * - participant_count는 RPC에 있을 수도 있고 없을 수도 있어서 optional로 둠
 */
type RawTeamRow = {
  id?: string | null
  name?: string | null
  purpose?: string | null
  participant_count?: number | null
  tag1?: string | null
  tag2?: string | null
  image_url?: string | null
  created_at?: string | null
}

/**
 * ✅ 화면에서 “확실히” 쓰는 정규화 타입
 * - id는 반드시 string (없으면 렌더링 금지)
 */
type TeamCard = {
  id: string
  name: string
  purpose: string | null
  joined: number
  tags: string[]
  imageSrc: string
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=60'

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

/**
 * image_url이 이미 전체 URL이면 그대로 사용.
 * 경로 형태(team/xxx.png)면 supabase public url로 조합.
 */
function buildTeamImageUrl(image_url: string | null | undefined) {
  const raw = (image_url ?? '').trim()
  if (!raw) return null

  // 이미 전체 URL이면 그대로
  if (/^https?:\/\//i.test(raw)) return raw

  // 경로(team/xxx.png)이면 Supabase public URL로 조합
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  if (!supabaseUrl) return raw

  const path = raw.replace(/^\//, '')
  // ⚠️ 버킷명이 지금 프로젝트에서 team-images 맞는지 확인 필요(기존 코드 그대로 유지)
  return `${stripTrailingSlash(supabaseUrl)}/storage/v1/object/public/team-images/${path}`
}

/**
 * ✅ 최종해결 핵심: Raw → Normalized
 * - id가 없으면 null 반환 → 렌더링(링크 생성) 자체를 막음
 */
function normalizeTeamRow(r: RawTeamRow): TeamCard | null {
  const id = String(r.id ?? '').trim()
  if (!id) return null

  const name = String(r.name ?? '').trim() || 'Untitled Team'
  const purpose = r.purpose ? String(r.purpose) : null

  const joinedRaw = Number(r.participant_count ?? 0)
  const joined = Number.isFinite(joinedRaw) && joinedRaw >= 0 ? joinedRaw : 0

  const tags = [r.tag1, r.tag2]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)

  const imageSrc = buildTeamImageUrl(r.image_url) || FALLBACK_IMG

  return { id, name, purpose, joined, tags, imageSrc }
}

export default function TeamPage() {
  const [rows, setRows] = useState<RawTeamRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true)

      const { data, error } = await supabase.rpc('get_teams_with_counts')

      if (error) {
        console.error('[get_teams_with_counts] error:', error)
        setRows([])
        setLoading(false)
        return
      }

      // ✅ 여기서 절대 TeamCard로 캐스팅하지 말고 Raw로 둔다
      setRows((data ?? []) as RawTeamRow[])
      setLoading(false)
    }

    fetchTeams()
  }, [])

  const teams = useMemo(() => {
    // ✅ 정규화 + id 없는 row는 제거
    return rows.map(normalizeTeamRow).filter((x): x is TeamCard => Boolean(x))
  }, [rows])

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-2 text-[20px] font-medium leading-tight">Team</h1>
        <p className="mb-8 text-[14px] font-medium text-[#b4b4b4]">
          Join small challenges and share routines together.
        </p>

        {loading ? (
          <p className="text-[13px] font-medium text-[#b4b4b4]">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="text-[13px] font-medium text-[#b4b4b4]">No teams available.</p>
        ) : (
          // ✅ PC: 2개씩 / 모바일: 1개
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {teams.map((t) => (
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.imageSrc} alt={t.name} className="h-[220px] w-full object-cover md:h-[260px]" />
                </div>

                <div className="p-6">
                  {/* 타이틀 + Joined */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[28px] font-semibold text-[#0e0e0e]">{t.name}</div>
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

                  {/* 태그 */}
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

                  {/* Join now 버튼 (디자인용) */}
                  <button
                    type="button"
                    className={['mt-6 w-full h-[40px]', 'bg-[#1e1e1e] text-white', 'text-[20px] font-semibold'].join(
                      ' '
                    )}
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
