// src/app/team/[teamId]/page.tsx
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import ShareButtonClient from './ShareButtonClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamRow = Pick<
  Database['public']['Tables']['teams']['Row'],
  'id' | 'name' | 'purpose' | 'image_url' | 'tag1' | 'tag2' | 'created_at'
>
type ActivityRow = Database['public']['Tables']['team_activities']['Row']
type PricingRow = Database['public']['Tables']['team_pricing_rules']['Row']

type DiscountStep = { participants: number; discount_percent: number }

function parseSteps(raw: any): DiscountStep[] {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => ({
      participants: Number(x?.participants ?? 0),
      discount_percent: Number(x?.discount_percent ?? 0),
    }))
    .filter((s) => Number.isFinite(s.participants) && Number.isFinite(s.discount_percent) && s.participants > 0)
    .sort((a, b) => a.participants - b.participants)
}

function calcCurrentDiscountPercent(count: number, steps: DiscountStep[]) {
  let best = 0
  for (const s of steps) {
    if (count >= s.participants) best = Math.max(best, s.discount_percent)
  }
  return best
}

function formatMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US').format(n) + (currency === 'KRW' ? ' KRW' : ` ${currency}`)
  } catch {
    return `${n} ${currency}`
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

async function getParticipantCount(supabase: Awaited<ReturnType<typeof createSupabaseServer>>, teamId: string) {
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if (error) return 0
  return Number(count ?? 0)
}

/**
 * ✅ Next 16+ 환경에서는 headers()가 Promise일 수 있어서 await 필요
 * ✅ params가 비는 케이스 방어
 * - 1차: params.teamId
 * - 2차: headers 기반으로 /team/{id} 파싱
 */
async function resolveTeamId(params: { teamId?: string } | undefined) {
  const raw1 = params?.teamId
  const teamId1 = typeof raw1 === 'string' ? decodeURIComponent(raw1).trim() : ''
  if (teamId1 && teamId1 !== 'undefined' && teamId1 !== 'null') return teamId1

  const h = await headers()

  const originalUrl = h.get('x-original-url')
  const invokePath = h.get('x-invoke-path')
  const rewriteUrl = h.get('x-rewrite-url')
  const matchedPath = h.get('x-matched-path')
  const referer = h.get('referer')

  const candidate = originalUrl || invokePath || rewriteUrl || referer || matchedPath || ''

  const m = candidate.match(/\/team\/([^/?#]+)/)
  const teamId2 = m?.[1] ? decodeURIComponent(m[1]).trim() : ''
  if (teamId2 && teamId2 !== 'undefined' && teamId2 !== 'null') return teamId2

  return ''
}

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const supabase = await createSupabaseServer()
  const teamId = await resolveTeamId(params)

  // ✅ 이전처럼 notFound()로 죽이지 말고 원인 출력
  if (!teamId) {
    const h = await headers()
    const debug = {
      params,
      headers: {
        'x-original-url': h.get('x-original-url'),
        'x-invoke-path': h.get('x-invoke-path'),
        'x-rewrite-url': h.get('x-rewrite-url'),
        'x-matched-path': h.get('x-matched-path'),
        referer: h.get('referer'),
      },
      note: 'teamId could not be resolved. This indicates routing/Link issue.',
    }

    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[28px] font-semibold">TEAM route params missing</h1>
          <p className="mt-2 text-[13px] text-[#7a7a7a]">
            This is why you saw a 404 before: the page called notFound() when teamId was empty.
          </p>

          <pre className="mt-6 whitespace-pre-wrap rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-[12px] text-[#111]">
{JSON.stringify(debug, null, 2)}
          </pre>

          <div className="mt-6">
            <Link href="/team" className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2">
              Back to TEAM →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const { data: teamRes, error: teamErr } = await supabase
    .from('teams')
    .select('id,name,purpose,image_url,tag1,tag2,created_at')
    .eq('id', teamId)
    .maybeSingle()

  if (teamErr || !teamRes) {
    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[28px] font-semibold">Team load failed</h1>
          <p className="mt-2 text-[13px] text-[#7a7a7a]">teamId: {teamId}</p>

          <pre className="mt-6 whitespace-pre-wrap rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-[12px] text-[#111]">
{JSON.stringify({ teamErr, teamRes }, null, 2)}
          </pre>

          <div className="mt-6">
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

  const { data: actRes } = await supabase
    .from('team_activities')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const activities = (actRes ?? []) as ActivityRow[]

  const { data: pricingRes } = await supabase
    .from('team_pricing_rules')
    .select('*')
    .eq('team_id', teamId)
    .maybeSingle()

  const pricing = (pricingRes ?? null) as PricingRow | null
  const steps = parseSteps((pricing as any)?.discount_steps)
  const basePrice = Number((pricing as any)?.base_price ?? 0)
  const currency = String((pricing as any)?.currency ?? 'KRW')

  const curDiscount = calcCurrentDiscountPercent(participantCount, steps)
  const discountedPrice = Math.max(0, Math.round(basePrice * (1 - curDiscount / 100)))

  const progressMax = steps.length > 0 ? steps[steps.length - 1].participants : 0
  const progressPct =
    progressMax > 0 ? Math.max(0, Math.min(100, Math.round((participantCount / progressMax) * 100))) : 0

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <div className="text-[44px] font-semibold tracking-tight">Team</div>
        </div>

        <div className="mt-8 mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white">
          {/* cover */}
          <div className="w-full bg-[#f3f3f3]">
            {team.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.image_url} alt={team.name ?? 'team'} className="w-full h-auto object-cover" />
            ) : (
              <div className="aspect-[16/9] w-full bg-[#d9d9d9]" />
            )}
          </div>

          <div className="p-6">
            {/* title + joined */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-[28px] font-semibold leading-tight">{team.name}</div>
              <div className="shrink-0 rounded-full bg-[#f2f2f2] px-4 py-2 text-[13px] font-medium text-[#6b6b6b]">
                Joined {participantCount}
              </div>
            </div>

            {/* purpose */}
            <div className="mt-3 text-[18px] leading-7 text-[#3a3a3a]">{team.purpose ?? 'No description yet.'}</div>

            {/* tags */}
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

            {/* share */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-[13px] text-[#7a7a7a]">Share this team with friends</div>
              <ShareButtonClient />
            </div>

            {/* pricing */}
            <div className="mt-8 rounded-2xl bg-[#111111] px-6 py-8 text-white">
              <div className="text-center text-[28px] font-semibold">Join now</div>

              <div className="mt-4 text-center">
                {basePrice > 0 ? (
                  <>
                    <div className="text-[14px] text-white/70">Current price</div>
                    <div className="mt-1 text-[26px] font-semibold">{formatMoney(discountedPrice, currency)}</div>
                    <div className="mt-1 text-[13px] text-white/70">
                      {participantCount} joined · {curDiscount}% discount
                    </div>
                  </>
                ) : (
                  <div className="text-[14px] text-white/70">Pricing not set yet. (Admin needs base price + steps)</div>
                )}
              </div>

              {/* progress */}
              {progressMax > 0 ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-[12px] text-white/70">
                    <span>
                      {participantCount} / {progressMax}
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div className="h-full bg-white/60" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              ) : null}

              {/* steps table */}
              {steps.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-xl border border-white/15">
                  <div className="grid grid-cols-3 bg-white/5 px-4 py-3 text-[13px] font-semibold">
                    <div>Participants</div>
                    <div>Discount</div>
                    <div>Price</div>
                  </div>
                  <div className="divide-y divide-white/10">
                    {steps.map((s, idx) => {
                      const price = Math.max(0, Math.round(basePrice * (1 - s.discount_percent / 100)))
                      const hit = participantCount >= s.participants
                      return (
                        <div
                          key={`${s.participants}_${idx}`}
                          className={[
                            'grid grid-cols-3 px-4 py-3 text-[13px]',
                            hit ? 'bg-white/10' : 'bg-transparent',
                          ].join(' ')}
                        >
                          <div>{s.participants}+</div>
                          <div>{s.discount_percent}%</div>
                          <div>{formatMoney(price, currency)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* activities */}
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
                    <div key={a.id} className="overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white">
                      {(a as any).image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(a as any).image_url} alt={a.title} className="w-full h-auto object-cover" />
                      ) : null}

                      <div className="p-5">
                        <div className="text-[20px] font-semibold">{a.title}</div>
                        {a.description ? (
                          <div className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[#3a3a3a]">
                            {a.description}
                          </div>
                        ) : null}
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
    </main>
  )
}
