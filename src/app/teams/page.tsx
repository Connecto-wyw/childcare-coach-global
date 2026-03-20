// src/app/teams/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { getDictionary, getLocale } from '@/i18n'
import { resolveI18n } from '@/lib/i18nFallback'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamCard = {
  id: string
  name: string
  image_url: string | null
  tag1: string | null
  tag2: string | null
  participant_count: number
}

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing env')

  const cookieStore = await cookies()
  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value },
      set(name: string, value: string, options: any) { try { cookieStore.set({ name, value, ...options }) } catch {} },
      remove(name: string, options: any) { try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }) } catch {} },
    },
  })
}

function safeText(v: unknown) {
  return String(v ?? '').trim()
}

function TeamCardItem({ team, membersLabel }: { team: TeamCard; membersLabel: string }) {
  const label = membersLabel.replace('{count}', String(team.participant_count ?? 0))
  return (
    <Link
      href={`/team/${team.id}`}
      className="block overflow-hidden rounded-xl border border-[#e9e9e9] bg-white hover:opacity-95 transition-opacity"
    >
      <div className="w-full aspect-[4/3] bg-[#f3f3f3] overflow-hidden">
        {team.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.image_url} alt={team.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-[#d9d9d9]" />
        )}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold text-[#0e0e0e] leading-snug line-clamp-2">{team.name}</div>
        <div className="mt-1 text-[11px] text-[#8a8a8a]">{label}</div>
        {(team.tag1 || team.tag2) ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {team.tag1 ? (
              <span className="rounded bg-[#EAF6FF] px-2 py-0.5 text-[11px] font-medium text-[#2F8EEA]">{team.tag1}</span>
            ) : null}
            {team.tag2 ? (
              <span className="rounded bg-[#EAF6FF] px-2 py-0.5 text-[11px] font-medium text-[#2F8EEA]">{team.tag2}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-[15px] font-bold text-[#0e0e0e] mb-3">{title}</h2>
}

export default async function TeamsPage() {
  const supabase = await createSupabaseServer()
  const locale = await getLocale()
  const t = await getDictionary('team')

  // 현재 로그인 유저
  const { data: { user } } = await supabase.auth.getUser()

  // ── 가입한 팀 ──────────────────────────────────────────
  let myTeams: TeamCard[] = []
  if (user) {
    const { data: memberRows } = await (supabase as any)
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)

    const myTeamIds: string[] = (memberRows ?? []).map((r: any) => r.team_id).filter(Boolean)

    if (myTeamIds.length > 0) {
      const { data: teamRows } = await (supabase as any)
        .from('teams_with_counts')
        .select('id,name,image_url,tag1,tag2,participant_count')
        .in('id', myTeamIds)

      myTeams = (teamRows ?? []).map((r: any) => ({
        id: String(r.id),
        name: safeText(r.name),
        image_url: r.image_url ?? null,
        tag1: r.tag1 ?? null,
        tag2: r.tag2 ?? null,
        participant_count: Number(r.participant_count ?? 0),
      }))
    }
  }

  // ── 추천 팀 (최신 3개) ──────────────────────────────────
  const { data: recRows } = await (supabase as any)
    .from('teams_with_counts')
    .select('id,name,image_url,tag1,tag2,participant_count')
    .order('participant_count', { ascending: false })
    .limit(6)

  const allTopTeams: TeamCard[] = (recRows ?? []).map((r: any) => ({
    id: String(r.id),
    name: safeText(r.name),
    image_url: r.image_url ?? null,
    tag1: r.tag1 ?? null,
    tag2: r.tag2 ?? null,
    participant_count: Number(r.participant_count ?? 0),
  }))

  const myTeamIdSet = new Set(myTeams.map((t) => t.id))
  const recommendedTeams = allTopTeams.filter((t) => !myTeamIdSet.has(t.id)).slice(0, 3)

  // ── 이번주 인기 팀 (멤버 수 기준 top 3, 추천과 겹치지 않게) ──
  const recIdSet = new Set(recommendedTeams.map((t) => t.id))
  const popularTeams = allTopTeams.filter((t) => !myTeamIdSet.has(t.id) && !recIdSet.has(t.id)).slice(0, 3)

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

        {/* 가입한 팀 */}
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
            <p className="text-[14px] text-[#b4b4b4]">{t.no_recommended}</p>
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
            <p className="text-[14px] text-[#b4b4b4]">{t.no_popular}</p>
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
