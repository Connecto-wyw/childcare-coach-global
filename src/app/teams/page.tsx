// src/app/teams/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getDictionary } from '@/i18n'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TeamCard = {
  id: string
  name: string
  member_count: number
  purposes: string[]
}

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
  return createServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  })
}

function TeamCardItem({ team, membersLabel }: { team: TeamCard; membersLabel: string }) {
  const label = membersLabel.replace('{count}', String(team.member_count))
  return (
    <div className="block overflow-hidden rounded-xl border border-[#e9e9e9] bg-white">
      <div className="w-full aspect-[4/3] bg-[#f3f3f3] flex items-center justify-center">
        <svg viewBox="0 0 40 40" className="w-10 h-10 text-[#d9d9d9]" fill="currentColor">
          <circle cx="20" cy="14" r="7" />
          <path d="M4 36c0-8.837 7.163-16 16-16s16 7.163 16 16" />
        </svg>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold text-[#0e0e0e] leading-snug line-clamp-2">{team.name}</div>
        <div className="mt-1 text-[11px] text-[#8a8a8a]">{label}</div>
        {team.purposes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {team.purposes.slice(0, 2).map((p) => (
              <span key={p} className="rounded bg-[#EAF6FF] px-2 py-0.5 text-[11px] font-medium text-[#2F8EEA]">{p}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-[15px] font-bold text-[#0e0e0e] mb-3">{title}</h2>
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-[14px] text-[#b4b4b4]">{label}</p>
}

export default async function TeamsPage() {
  const t = await getDictionary('team')
  const supabase = await getSupabase()

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id ?? null

  // 가입한 팀 (내가 만든 팀 + 멤버로 가입한 팀)
  let myTeams: TeamCard[] = []
  if (userId) {
    const { data: owned } = await (supabase as any)
      .from('community_teams')
      .select('id, name, purposes')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    const { data: memberships } = await (supabase as any)
      .from('community_team_members')
      .select('team_id, community_teams(id, name, purposes)')
      .eq('user_id', userId)

    const memberTeams = (memberships ?? [])
      .map((m: any) => m.community_teams)
      .filter(Boolean)

    const allMyTeams = [...(owned ?? []), ...memberTeams]
    const seen = new Set<string>()
    const unique = allMyTeams.filter((t: any) => { if (seen.has(t.id)) return false; seen.add(t.id); return true })

    myTeams = await Promise.all(
      unique.map(async (team: any) => {
        const { count } = await (supabase as any)
          .from('community_team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
        return { id: team.id, name: team.name, purposes: team.purposes ?? [], member_count: (count ?? 0) + 1 }
      })
    )
  }

  const recommendedTeams: TeamCard[] = []
  const popularTeams: TeamCard[] = []

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e] pb-[160px]">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[24px] font-bold text-[#0e0e0e]">TEAM</h1>
          <Link
            href="/teams/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#3497f3] text-white text-[13px] font-semibold hover:bg-[#1f7fd4] transition-colors"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            {t.create_team}
          </Link>
        </div>

        {/* 가입한 팀 — 있을 때만 표시 */}
        {myTeams.length > 0 ? (
          <section className="mb-10">
            <SectionTitle title={t.my_teams} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myTeams.map((team) => (
                <TeamCardItem key={team.id} team={team} membersLabel={t.members} />
              ))}
            </div>
          </section>
        ) : null}

        {/* 추천 팀 */}
        <section className="mb-10">
          <SectionTitle title={t.recommended_teams} />
          {recommendedTeams.length === 0 ? (
            <EmptyState label={t.no_recommended} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recommendedTeams.map((team) => (
                <TeamCardItem key={team.id} team={team} membersLabel={t.members} />
              ))}
            </div>
          )}
        </section>

        {/* 이번주 인기 팀 */}
        <section className="mb-10">
          <SectionTitle title={t.popular_teams} />
          {popularTeams.length === 0 ? (
            <EmptyState label={t.no_popular} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {popularTeams.map((team) => (
                <TeamCardItem key={team.id} team={team} membersLabel={t.members} />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
