// src/app/teams/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getDictionary } from '@/i18n'
import PageHeader from '@/components/layout/PageHeader'
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

const ANIMAL_IMAGES = [
  'Blue_나비','Blue_늑대','Blue_돌고래','Blue_말','Blue_물고기','Blue_부엉이','Blue_풍뎅이','Blue_호랑이',
  'Green_나비','Green_늑대','Green_돌고래','Green_말','Green_물고기','Green_부엉이','Green_풍뎅이','Green_호랑이',
  'Red_나비','Red_늑대','Red_돌고래','Red_말','Red_물고기','Red_부엉이','Red_풍뎅이','Red_호랑이',
  'Yellow_나비','Yellow_늑대','Yellow_돌고래','Yellow_말','Yellow_물고기','Yellow_부엉이','Yellow_풍뎅이','Yellow_호랑이',
]

const BG_COLORS: Record<string, string> = {
  Blue: '#EAF4FF', Green: '#EAFAF0', Red: '#FFF0F0', Yellow: '#FFFBEA',
}

function getAnimalImage(teamId: string) {
  const hash = teamId.replace(/-/g, '').slice(0, 8)
  const idx = parseInt(hash, 16) % ANIMAL_IMAGES.length
  const name = ANIMAL_IMAGES[idx]
  const color = name.split('_')[0]
  return { src: `/animals/${name}.png`, bg: BG_COLORS[color] ?? '#f3f3f3' }
}

function TeamCardItem({ team, membersLabel }: { team: TeamCard; membersLabel: string }) {
  const label = membersLabel.replace('{count}', String(team.member_count))
  const { src, bg } = getAnimalImage(team.id)
  return (
    <Link href={`/teams/${team.id}`} className="block overflow-hidden rounded-xl border border-[#e9e9e9] bg-white hover:opacity-95 transition-opacity">
      <div className="w-full aspect-[4/3] flex items-center justify-center" style={{ background: bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="w-full h-full object-cover" />
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
    </Link>
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
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 mb-0">
          <div className="flex-1">
            <PageHeader title="TEAM" subtitle={t.subtitle} />
          </div>
          <Link
            href="/teams/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#3497f3] text-white text-[13px] font-semibold hover:bg-[#1f7fd4] transition-colors shrink-0 mt-1"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            {t.create_team}
          </Link>
        </div>
        <div className="mt-8" />

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
