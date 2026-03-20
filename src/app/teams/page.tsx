// src/app/teams/page.tsx (Server Component)
import Link from 'next/link'
import { getDictionary } from '@/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TeamCard = {
  id: string
  name: string
  image_url: string | null
  tag1: string | null
  tag2: string | null
  member_count: number
}

function TeamCardItem({ team, membersLabel }: { team: TeamCard; membersLabel: string }) {
  const label = membersLabel.replace('{count}', String(team.member_count))
  return (
    <Link
      href={`/teams/${team.id}`}
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

function EmptyState({ label }: { label: string }) {
  return <p className="text-[14px] text-[#b4b4b4]">{label}</p>
}

export default async function TeamsPage() {
  const t = await getDictionary('team')

  // TODO: 새 TEAM 기능 DB 연동 시 여기에 쿼리 추가
  const myTeams: TeamCard[] = []
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
