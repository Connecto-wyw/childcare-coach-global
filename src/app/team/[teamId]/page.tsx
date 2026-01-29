// src/app/team/[teamId]/page.tsx
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import ShareButtonClient from './ShareButtonClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamRow = Pick<
  Database['public']['Tables']['teams']['Row'],
  'id' | 'name' | 'purpose' | 'image_url' | 'tag1' | 'tag2' | 'created_at'
>

// ✅ 현재 네 database.types.ts 기준: team_activities는 description 기반
type ActivityRow = Database['public']['Tables']['team_activities']['Row']

function formatDateShort(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US')
  } catch {
    return ''
  }
}

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

async function getParticipantCount(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  teamId: string
) {
  // ✅ 우선 team_members count로 처리 (확실)
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if (error) return 0
  return Number(count ?? 0)
}

function TagPill({ children }: { children: string }) {
  return (
    <span className="rounded-md bg-[#EAF6FF] px-4 py-2 text-[18px] font-medium text-[#2F8EEA]">
      {children}
    </span>
  )
}

function ShareRow() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[13px] text-[#7a7a7a]">Share this team with friends</div>
      <ShareButtonClient />
    </div>
  )
}

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const supabase = await createSupabaseServer()
  const teamId = params.teamId

  const { data: teamRes, error: teamErr } = await supabase
    .from('teams')
    .select('id,name,purpose,image_url,tag1,tag2,created_at')
    .eq('id', teamId)
    .maybeSingle()

  // ✅ 여기서 404를 막고, 원인을 화면에 노출(운영에서도 확인 가능하게)
  if (teamErr) {
    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="text-[22px] font-semibold">Team load failed</div>
          <div className="mt-2 text-[14px] text-[#7a7a7a]">{teamErr.message}</div>
          <div className="mt-8">
            <Link href="/team" className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2">
              Back to TEAM →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!teamRes) {
    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="text-[22px] font-semibold">Team not found</div>
          <div className="mt-2 text-[14px] text-[#7a7a7a]">This team id does not exist, or is blocked by RLS.</div>
          <div className="mt-8">
            <Link href="/team" className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2">
              Back to TEAM →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const team = teamRes as TeamRow
  const participantCount = await getParticipantCount(supabase, teamId)

  // ✅ 활동(게시판) 목록: 현재 스키마에 맞춰 description만 사용
  const { data: actRes, error: actErr } = await supabase
    .from('team_activities')
    .select('id, team_id, title, description, starts_at, ends_at, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  const activities = (actErr ? [] : (actRes ?? [])) as ActivityRow[]

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-center">
          <div className="text-[44px] font-semibold tracking-tight">Team</div>
        </div>

        <div className="mt-8 mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-sm">
            <div className="w-full bg-[#f3f3f3]">
              {team.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.image_url} alt={team.name ?? 'team'} className="h-auto w-full object-cover" />
              ) : (
                <div className="aspect-[16/9] w-full bg-[#d9d9d9]" />
              )}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[28px] font-semibold leading-tight">{team.name}</div>
                <div className="shrink-0 rounded-full bg-[#f2f2f2] px-4 py-2 text-[13px] font-medium text-[#6b6b6b]">
                  Joined {participantCount}
                </div>
              </div>

              <div className="mt-3 text-[18px] leading-7 text-[#3a3a3a]">
                {team.purpose ?? 'No description yet.'}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {team.tag1 ? <TagPill>{team.tag1}</TagPill> : null}
                {team.tag2 ? <TagPill>{team.tag2}</TagPill> : null}
              </div>

              <div className="mt-5">
                <ShareRow />
              </div>

              {/* ✅ 가격/할인 UI는 DB 테이블 확정 후 붙이자 (지금은 스키마 불일치로 404 주범이었음) */}
              <div className="mt-8 rounded-2xl bg-[#111111] px-6 py-8 text-white">
                <div className="text-center text-[28px] font-semibold">Join now</div>
                <div className="mt-3 text-center text-[14px] text-white/70">
                  Pricing rules will appear here after admin config is connected.
                </div>
              </div>

              <div className="mt-10">
                <div className="text-[18px] font-semibold">TEAM UP Activities</div>
                <div className="mt-2 text-[14px] text-[#7a7a7a]">Activities created by admin will appear here.</div>

                {activities.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-[#e5e5e5] bg-white p-6 text-[#7a7a7a]">
                    Activities list will appear here.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5">
                    {activities.map((a) => (
                      <div key={a.id} className="rounded-2xl border border-[#e5e5e5] bg-white overflow-hidden">
                        <div className="p-5">
                          <div className="text-[20px] font-semibold">{a.title}</div>
                          {a.description ? (
                            <div className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[#3a3a3a]">
                              {a.description}
                            </div>
                          ) : null}
                          <div className="mt-3 text-[12px] text-[#9a9a9a]">{formatDateShort(a.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-10">
                <Link href="/team" className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2">
                  Back to TEAM →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
