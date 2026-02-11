'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/app/providers'

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

function buildTeamImageUrl(image_url: string | null | undefined) {
  const raw = (image_url ?? '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) return raw

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  if (!supabaseUrl) return raw

  const path = raw.replace(/^\//, '')
  return `${stripTrailingSlash(supabaseUrl)}/storage/v1/object/public/team-images/${path}`
}

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
  const supabase = useSupabase()

  const [rows, setRows] = useState<RawTeamRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const fetchTeams = async () => {
      setLoading(true)

      const { data, error } = await supabase.rpc('get_teams_with_counts')

      if (!alive) return

      if (error) {
        console.error('[get_teams_with_counts] error:', error)
        setRows([])
        setLoading(false)
        return
      }

      setRows((data ?? []) as RawTeamRow[])
      setLoading(false)
    }

    fetchTeams()

    return () => {
      alive = false
    }
  }, [supabase])

  const teams = useMemo(() => {
    return rows.map(normalizeTeamRow).filter((x): x is TeamCard => Boolean(x))
  }, [rows])

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-2 text-[22px] font-medium leading-tight">Team</h1>
        <p className="mb-8 text-[14px] font-medium text-[#b4b4b4]">
          Trending K-Parenting goods parents love. Join together, unlock better prices. Beta now.
        </p>

        {loading ? (
          <p className="text-[13px] font-medium text-[#b4b4b4]">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="text-[13px] font-medium text-[#b4b4b4]">No teams available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {teams.map((t) => (
              <Link
                key={t.id}
                href={`/team/${t.id}`}
                className="block overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:border-[#dcdcdc]"
              >
                <div className="w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.imageSrc} alt={t.name} className="h-[220px] w-full object-cover md:h-[260px]" />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[19px] font-semibold text-[#0e0e0e]">{t.name}</div>
                    </div>

                    <div
                      className="shrink-0 rounded-full bg-[#9F1D23]/10 px-4 py-2 text-[13px] font-semibold text-[#9F1D23] flex items-center gap-2"
                      aria-label={`Joined ${t.joined}`}
                      title={`Joined ${t.joined}`}
                    >
                      <span className="inline-block h-4 w-4 rounded-full bg-[#9F1D23]" />
                      Joined {t.joined}
                    </div>
                  </div>

                  <div className="mt-3 line-clamp-3 text-[15px] font-medium leading-relaxed text-[#8f8f8f]">
                    {t.purpose || 'No description yet.'}
                  </div>

                  {t.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-[#d8e9ff] bg-[#f0f7fd] px-5 py-2 text-[15px] font-semibold text-[#3497f3]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="mt-6 w-full h-[40px] bg-[#1e1e1e] text-white text-[20px] font-semibold"
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
