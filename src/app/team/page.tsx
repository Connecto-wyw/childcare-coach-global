// src/app/team/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import PageHeader from '@/components/layout/PageHeader'
import { getDictionary, getLocale } from '@/i18n'
import { resolveI18n } from '@/lib/i18nFallback'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamRow = Pick<
  Database['public']['Tables']['teams']['Row'],
  'id' | 'name' | 'purpose' | 'image_url' | 'tag1' | 'tag2' | 'created_at'
> & { name_i18n?: any; purpose_i18n?: any }

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const cookieStore = await cookies()

  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        } catch {}
      },
    },
  })
}

function safeText(v: unknown) {
  return String(v ?? '').trim()
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-8 px-4 rounded-md bg-[#EAF6FF] text-[#2F8EEA] text-[14px] font-medium">
      {label}
    </span>
  )
}

function JoinedPill({ count, labelTmpl }: { count: number; labelTmpl: string }) {
  const label = labelTmpl.replace('{count}', count.toString())
  return (
    <span className="inline-flex items-center h-8 px-4 rounded-full bg-[#f2f2f2] text-[#6b6b6b] text-[13px] font-medium">
      {label}
    </span>
  )
}

async function fetchTeams(sb: Awaited<ReturnType<typeof createSupabaseServer>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySb: any = sb

  // ✅ participantCount를 같이 들고 오려면 RPC/뷰가 필요하므로,
  // 여기선 "teams" 기본 + 각 팀별 team_members count를 추가로 조회(간단/확실).
  const { data, error } = await anySb
    .from('teams')
    .select('id,name,name_i18n,purpose,purpose_i18n,image_url,tag1,tag2,created_at')
    .order('created_at', { ascending: false })

  if (error) return [] as TeamRow[]
  return (data ?? []) as TeamRow[]
}

async function getParticipantCountMap(
  sb: Awaited<ReturnType<typeof createSupabaseServer>>,
  teamIds: string[]
) {
  // ✅ team_members에서 team_id별 count를 한 번에 집계하려면 view/RPC가 제일 깔끔하지만
  // 지금은 schema가 확실치 않으니 "group by" 가능한 select를 시도하고, 실패 시 0 처리.
  const map = new Map<string, number>()

  if (teamIds.length === 0) return map

  try {
    // Supabase PostgREST에서 group-by는 직접 지원이 애매할 때가 있어서
    // 가장 안전한 방식: head:true exact count를 팀마다 호출 (N이 작으면 OK)
    // 팀이 많아지면 RPC로 바꾸자.
    await Promise.all(
      teamIds.map(async (id) => {
        const { count, error } = await sb
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', id)

        map.set(id, error ? 0 : Number(count ?? 0))
      })
    )
  } catch {
    for (const id of teamIds) map.set(id, 0)
  }

  return map
}

export default async function TeamPage() {
  const supabase = await createSupabaseServer()
  const teams = await fetchTeams(supabase)

  const teamIds = teams.map((t) => String(t.id))
  const countMap = await getParticipantCountMap(supabase, teamIds)
  const t = await getDictionary('team')
  const locale = await getLocale()

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* ✅ News/About과 동일한 상단 구조 + 설명 아래 회색줄 */}
        <PageHeader
          title={t.title}
          subtitle={t.subtitle}
        />

        {teams.length === 0 ? (
          <div className="py-16 text-[#b4b4b4] text-[15px] font-medium">{t.no_teams}</div>
        ) : (
            <ul className="divide-y divide-[#eeeeee]">
              {teams.map((tm) => {
                const id = String(tm.id)
                const name = safeText(resolveI18n(tm.name, tm.name_i18n, locale)) || t.untitled
                const purpose = safeText(resolveI18n(tm.purpose, tm.purpose_i18n, locale))
                const cover = safeText(tm.image_url)
              const tag1 = safeText(tm.tag1)
              const tag2 = safeText(tm.tag2)
              const joined = Number(countMap.get(id) ?? 0)

              return (
                <li key={id}>
                  <Link href={`/team/${id}`} className="block py-10 hover:bg-[#fafafa] transition">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      {/* ✅ 썸네일: 스샷처럼 가로 맞추되 안정적으로 */}
                      <div className="w-full sm:w-[360px] shrink-0">
                        <div className="w-full aspect-square bg-[#d9d9d9] overflow-hidden rounded-2xl border border-[#efefef]">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={name} className="w-full h-full object-cover" loading="lazy" />
                          ) : null}
                        </div>
                      </div>

                      {/* ✅ 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <h2 className="text-[22px] font-semibold leading-tight truncate">{name}</h2>
                          <div className="shrink-0">
                            <JoinedPill count={joined} labelTmpl={t.joined} />
                          </div>
                        </div>

                        {purpose ? (
                          <p className="mt-3 text-[15px] text-[#7a7a7a] leading-relaxed line-clamp-3">
                            {purpose}
                          </p>
                        ) : null}

                        {(tag1 || tag2) ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {tag1 ? <TagPill label={tag1} /> : null}
                            {tag2 ? <TagPill label={tag2} /> : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}