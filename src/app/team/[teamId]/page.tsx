// src/app/team/[teamId]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
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

// ✅ 네 DB의 team_activities 실제 타입(에러 메시지 기준)
type ActivityRow = {
  id: string
  team_id: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

function formatDateShort(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US')
  } catch {
    return ''
  }
}

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
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

async function getParticipantCount(supabase: Awaited<ReturnType<typeof createSupabaseServer>>, teamId: string) {
  // 1) RPC 있으면 사용
  const rpcTry = await supabase.rpc('get_team_participant_count' as any, { team_id: teamId } as any)
  if (!rpcTry.error && typeof (rpcTry.data as any) === 'number') return Number(rpcTry.data)

  // 2) 없으면 team_members 카운트
  const { count, error } = await supabase
    .from('team_members' as any)
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if (error) return 0
  return Number(count ?? 0)
}

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const supabase = await createSupabaseServer()
  const teamId = params.teamId

  const { data: teamRes, error: teamErr } = await supabase
    .from('teams')
    .select('id,name,purpose,image_url,tag1,tag2,created_at')
    .eq('id', teamId)
    .maybeSingle()

  if (teamErr || !teamRes) return notFound()
  const team = teamRes as TeamRow

  const participantCount = await getParticipantCount(supabase, teamId)

  // ✅ sort_order 없음 → created_at DESC로만 정렬
  const { data: actRes } = await supabase
    .from('team_activities')
    .select('id,team_id,title,description,starts_at,ends_at,created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  const activities = (actRes ?? []) as ActivityRow[]

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 상단 타이틀 */}
        <div className="text-center">
          <div className="text-[44px] font-semibold tracking-tight">Team</div>
        </div>

        {/* 카드 */}
        <div className="mt-8 mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-sm">
            {/* 커버 */}
            <div className="w-full bg-[#f3f3f3]">
              {team.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.image_url} alt={team.name ?? 'team'} className="h-auto w-full object-cover" />
              ) : (
                <div className="aspect-[16/9] w-full bg-[#d9d9d9]" />
              )}
            </div>

            <div className="p-6">
              {/* 제목 + Joined */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-[28px] font-semibold leading-tight">{team.name}</div>

                <div className="shrink-0 rounded-full bg-[#f2f2f2] px-4 py-2 text-[13px] font-medium text-[#6b6b6b]">
                  Joined {participantCount}
                </div>
              </div>

              {/* 설명 */}
              <div className="mt-3 text-[18px] leading-7 text-[#3a3a3a]">
                {team.purpose ?? 'No description yet.'}
              </div>

              {/* 태그 */}
              <div className="mt-4 flex flex-wrap gap-2">
                {team.tag1 ? (
                  <span className="rounded-md bg-[#EAF6FF] px-4 py-2 text-[18px] font-medium text-[#2F8EEA]">
                    {team.tag1}
                  </span>
                ) : null}
                {team.tag2 ? (
                  <span className="rounded-md bg-[#EAF6FF] px-4 py-2 text-[18px] font-medium text-[#2F8EEA]">
                    {team.tag2}
                  </span>
                ) : null}
              </div>

              {/* 공유 */}
              <div className="mt-5">
                <ShareRow />
              </div>

              {/* ✅ 프라이싱: 아직 DB 테이블이 없으니 “설정 전” 상태로만 표시 */}
              <div className="mt-8 rounded-2xl bg-[#111111] px-6 py-8 text-white">
                <div className="text-center text-[28px] font-semibold">Join now</div>
                <div className="mt-4 text-center text-[14px] text-white/70">
                  Pricing is not configured yet. (Next step: add pricing table + admin editor)
                </div>
              </div>

              {/* 활동/게시판 */}
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
                          ) : (
                            <div className="mt-2 text-[14px] text-[#7a7a7a]">No description.</div>
                          )}

                          <div className="mt-3 text-[12px] text-[#9a9a9a]">{formatDateShort(a.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 목록으로 */}
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

/** 공유 버튼: Web Share API 우선 → 안되면 클립보드 */
function ShareRow() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[13px] text-[#7a7a7a]">Share this team with friends</div>
      <ShareButton />
    </div>
  )
}

function ShareButton() {
  return <ShareButtonClient />
}
