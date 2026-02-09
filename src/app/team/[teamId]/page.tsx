// src/app/team/[teamId]/page.tsx
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import ShareButtonClient from './ShareButtonClient'
import JoinButtonClient from './JoinButtonClient'

// ✅ 마크다운 렌더 (fallback용)
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamRow = Pick<
  Database['public']['Tables']['teams']['Row'],
  'id' | 'name' | 'purpose' | 'image_url' | 'tag1' | 'tag2' | 'created_at'
> & {
  detail_image_url: string | null
  detail_markdown: string | null
}

type PricingRow = Database['public']['Tables']['team_pricing_rules']['Row']
type DiscountStep = { participants: number; discount_percent: number }

const FALLBACK_DETAIL_TITLE = 'Details'
const FALLBACK_DETAIL_TEXT = 'No additional details yet.'

const SKY_BLUE = '#3EB6F1'
const SKY_BLUE_LIGHT = '#EAF6FF'

// ✅ 하드코딩 상세를 적용할 teamId들
const HARDCODED = {
  K_TABLEWARE: 'eee3586c-2ffe-45c5-888d-0a98f4d0b0d9',
  POSTPARTUM_KIT: '91780f15-d69a-4a46-bcda-dfedd0dc2a46',
} as const

function parseSteps(raw: any): DiscountStep[] {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => ({
      participants: Number(x?.participants ?? 0),
      discount_percent: Number(x?.discount_percent ?? 0),
    }))
    .filter(
      (s) =>
        Number.isFinite(s.participants) &&
        Number.isFinite(s.discount_percent) &&
        s.participants > 0
    )
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
    return (
      new Intl.NumberFormat('en-US').format(n) +
      (currency === 'KRW' ? ' KRW' : ` ${currency}`)
    )
  } catch {
    return `${n} ${currency}`
  }
}

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

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
  sb: Awaited<ReturnType<typeof createSupabaseServer>>,
  teamId: string
) {
  const { count, error } = await sb
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if (error) return 0
  return Number(count ?? 0)
}

/**
 * params가 비는 케이스 방어
 * - 1차: params.teamId
 * - 2차: headers에서 /team/{id} 추출
 */
async function resolveTeamId(paramsObj: { teamId?: string } | undefined) {
  const raw1 = paramsObj?.teamId
  const teamId1 = typeof raw1 === 'string' ? decodeURIComponent(raw1).trim() : ''
  if (teamId1 && teamId1 !== 'undefined' && teamId1 !== 'null') return teamId1

  const h = await headers()
  const candidate =
    h.get('x-original-url') ||
    h.get('x-invoke-path') ||
    h.get('x-rewrite-url') ||
    h.get('referer') ||
    h.get('x-matched-path') ||
    ''

  const m = candidate.match(/\/team\/([^/?#]+)/)
  const teamId2 = m?.[1] ? decodeURIComponent(m[1]).trim() : ''
  if (teamId2 && teamId2 !== 'undefined' && teamId2 !== 'null') return teamId2

  return ''
}

/* -----------------------------------------
   ✅ Hardcoded detail: Shared “Intro Header”
------------------------------------------ */
function ProductIntroHeader({
  title,
}: {
  title: string
}) {
  return (
    <div className="border-b border-[#efefef] bg-[#fafafa] px-6 py-5">
      <div className="text-[13px] font-semibold text-[#6f6f6f]">
        Trending & Premium from Korea
      </div>

      <div className="mt-1 text-[22px] font-semibold leading-snug text-[#0e0e0e]">
        {title}
      </div>

      <div className="mt-3 space-y-1 text-[14px] leading-relaxed text-[#5f5f5f]">
        <div>The more people join, the lower the price drops. The power of community unlocks better deals.</div>

        <div className="mt-2">
          ✨ <span className="font-semibold text-[#0e0e0e]">We are currently in beta.</span> Clicking “Join now” will NOT charge you.
        </div>
        <div>When payments and shipping officially launch, you’ll be the first to know via your signed-in Google email.</div>
        <div className="pt-1">
          <span className="font-semibold text-[#0e0e0e]">Join early.</span> Unlock better prices. Be part of something new.
        </div>
      </div>
    </div>
  )
}

/* -----------------------------------------
   ✅ Hardcoded detail 1: K-Kids Tableware
------------------------------------------ */
function HardcodedDetailForKTableware() {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white">
      <ProductIntroHeader title="Discover the most trending and premium products from South Korea — carefully curated for you." />

      <div className="px-6 py-6">
        <div className="flex items-start gap-3">
          <div className="mt-[2px] flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f7fd] text-[18px]">
            🍽️
          </div>
          <div className="min-w-0">
            <div className="text-[20px] font-semibold text-[#0e0e0e]">
              K-Kids Silicone Tableware Set
            </div>
            <div className="mt-1 text-[14px] font-medium text-[#7a7a7a]">
              Safe. Smart. Beautifully designed for modern families.
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {[
            {
              no: '1',
              title: 'Designed for Little Hands',
              emoji: '🖐️ 👶',
              body:
                'Thoughtfully shaped for small hands learning to eat independently. The ergonomic curves and balanced weight help children grip comfortably, building confidence at every meal.',
            },
            {
              no: '2',
              title: 'Safe, Food-Grade Silicone',
              emoji: '🌿 🛡️',
              body:
                'Made with BPA-free, food-grade silicone trusted by Korean parents. Soft, durable, and gentle on little mouths — giving parents peace of mind at every bite.',
            },
            {
              no: '3',
              title: 'Strong Suction, Less Mess',
              emoji: '💪 🍽️',
              body:
                'The powerful suction base keeps bowls and plates firmly in place. Less slipping, fewer spills, and calmer mealtimes for both parents and toddlers.',
            },
            {
              no: '4',
              title: 'Everyday Practical & Easy to Clean',
              emoji: '🧼 ✨',
              body:
                'Dishwasher-safe and effortless to wash by hand. Designed for busy family routines — because parenting is already demanding enough.',
            },
            {
              no: '5',
              title: 'Minimal Korean Design',
              emoji: '🎀 🇰🇷',
              body:
                'Soft neutral tones and clean, modern aesthetics inspired by Korean parenting style. Beautiful enough to leave on your table, functional enough to use every day.',
            },
          ].map((x) => (
            <div key={x.no} className="rounded-2xl border border-[#efefef] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-[#111] px-2 text-[12px] font-semibold text-white">
                      {x.no}
                    </span>
                    <div className="truncate text-[16px] font-semibold text-[#0e0e0e]">
                      {x.title}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-[16px]">{x.emoji}</div>
              </div>
              <div className="mt-3 text-[14px] leading-relaxed text-[#5f5f5f]">
                {x.body}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#e9e9e9] bg-[#fafafa] p-6">
          <div className="text-[16px] font-semibold text-[#0e0e0e]">
            🌸 Why Parents Love It in Southeast Asia
          </div>

          <ul className="mt-4 space-y-2 text-[14px] font-medium text-[#555]">
            {[
              'Safe materials you can trust',
              'Designed to support self-feeding milestones',
              'Reduces mealtime stress and mess',
              'Stylish enough for modern homes',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#e8f6ee] text-[12px] font-bold text-[#1f7a3b]">
                  ✓
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 text-[14px] font-semibold text-[#0e0e0e]">
            Smarter mealtimes. Safer materials. The Korean way.
          </div>
        </div>
      </div>
    </section>
  )
}

/* -----------------------------------------
   ✅ Hardcoded detail 2: Postpartum Kit
------------------------------------------ */
function HardcodedDetailForPostpartumKit() {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white">
      <ProductIntroHeader title="Discover the most trending and premium products from South Korea — carefully curated for you." />

      <div className="px-6 py-6">
        <div className="flex items-start gap-3">
          <div className="mt-[2px] flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6f0ff] text-[18px]">
            🌿
          </div>
          <div className="min-w-0">
            <div className="text-[20px] font-semibold text-[#0e0e0e]">
              Korean Postpartum Care Starter Kit
            </div>
            <div className="mt-1 text-[14px] font-medium text-[#7a7a7a]">
              Bring the warmth and wisdom of Korean postpartum care into your home.
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {[
            {
              no: '1',
              title: 'Trusted by Korean Mothers',
              emoji: '🤱🇰🇷',
              body:
                'In Korea, postpartum care is not optional — it’s a deeply respected tradition. This starter kit is inspired by real recovery routines practiced by Korean mothers, designed to help your body rest, restore, and feel supported during the most delicate stage after birth.',
            },
            {
              no: '2',
              title: 'Gentle Daily Recovery',
              emoji: '🌙✨',
              body:
                'After delivery, your body needs softness — not stress. This kit focuses on small, comforting daily rituals that help you feel calmer, lighter, and more balanced. It’s not about dramatic changes — it’s about steady, nurturing recovery every single day.',
            },
            {
              no: '3',
              title: 'Warmth & Comfort First',
              emoji: '🔥💛',
              body:
                'Korean postpartum care emphasizes warmth and proper rest to help the body regain balance. Even in tropical climates, air-conditioning, sleepless nights, and fatigue can leave your body feeling cold and depleted. This set supports that essential feeling of warmth, grounding, and protection.',
            },
            {
              no: '4',
              title: 'Simple, Ready-to-Use Set',
              emoji: '🎁🌸',
              body:
                'No complicated steps. No confusing routines. Everything you need is thoughtfully prepared in one easy starter kit — perfect for busy new moms who want recovery without overwhelm.',
            },
            {
              no: '5',
              title: 'Self-Care at Home',
              emoji: '🏡💗',
              body:
                'Not everyone can access a postpartum center — and that’s okay. Experience Korean-style recovery safely and comfortably at home, with products that support rest, comfort, and mindful care.',
            },
          ].map((x) => (
            <div key={x.no} className="rounded-2xl border border-[#efefef] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-[#111] px-2 text-[12px] font-semibold text-white">
                      {x.no}
                    </span>
                    <div className="truncate text-[16px] font-semibold text-[#0e0e0e]">
                      {x.title}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-[16px]">{x.emoji}</div>
              </div>
              <div className="mt-3 text-[14px] leading-relaxed text-[#5f5f5f]">
                {x.body}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#e9e9e9] bg-[#fafafa] p-6">
          <div className="text-[16px] font-semibold text-[#0e0e0e]">
            🌺 Why Moms in Southeast Asia Love It
          </div>

          <ul className="mt-4 space-y-2 text-[14px] font-medium text-[#555]">
            {[
              'Inspired by Korea’s trusted postpartum tradition',
              'Practical, essential items — no unnecessary extras',
              'Designed for comfort, recovery, and emotional ease',
              'A meaningful gift for new mothers',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#e8f6ee] text-[12px] font-bold text-[#1f7a3b]">
                  ✓
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 text-[14px] font-semibold text-[#0e0e0e]">
            Rest. Warmth. Recovery. The Korean way.
          </div>
        </div>
      </div>
    </section>
  )
}

/* -----------------------------------------
   ✅ teamId별 하드코딩 상세 렌더
------------------------------------------ */
function renderHardcodedDetail(teamId: string) {
  if (teamId === HARDCODED.K_TABLEWARE) return <HardcodedDetailForKTableware />
  if (teamId === HARDCODED.POSTPARTUM_KIT) return <HardcodedDetailForPostpartumKit />
  return null
}

// ✅ Next 16에서 params가 Promise로 올 수 있음
export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const sb = await createSupabaseServer()

  const p = await params
  const teamId = await resolveTeamId(p)

  if (!teamId) {
    const h = await headers()
    const debug = {
      params: p,
      headers: {
        'x-original-url': h.get('x-original-url'),
        'x-invoke-path': h.get('x-invoke-path'),
        'x-rewrite-url': h.get('x-rewrite-url'),
        'x-matched-path': h.get('x-matched-path'),
        referer: h.get('referer'),
      },
      note: 'teamId could not be resolved.',
    }

    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[28px] font-semibold">TEAM route params missing</h1>
          <pre className="mt-6 whitespace-pre-wrap rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-[12px] text-[#111]">
            {JSON.stringify(debug, null, 2)}
          </pre>
          <div className="mt-6">
            <Link
              href="/team"
              className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2"
            >
              Back to TEAM →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const { data: teamRes, error: teamErr } = await sb
    .from('teams')
    .select('id,name,purpose,image_url,tag1,tag2,detail_image_url,detail_markdown,created_at')
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
            <Link
              href="/team"
              className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2"
            >
              Back to TEAM →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const team = teamRes as unknown as TeamRow
  const participantCount = await getParticipantCount(sb, teamId)

  const { data: pricingRes } = await sb
    .from('team_pricing_rules')
    .select('*')
    .eq('team_id', teamId)
    .maybeSingle()

  const pricing = (pricingRes ?? null) as PricingRow | null
  const steps = parseSteps((pricing as any)?.discount_steps)
  const basePrice = Number((pricing as any)?.base_price ?? 0)
  const minPrice = Number((pricing as any)?.min_price ?? 0)
  const currency = String((pricing as any)?.currency ?? 'KRW')

  const curDiscount = calcCurrentDiscountPercent(participantCount, steps)
  const discountedPriceRaw = Math.max(0, Math.round(basePrice * (1 - curDiscount / 100)))
  const discountedPrice = minPrice > 0 ? Math.max(minPrice, discountedPriceRaw) : discountedPriceRaw

  const progressMax = steps.length > 0 ? steps[steps.length - 1].participants : 0
  const progressPct =
    progressMax > 0 ? Math.max(0, Math.min(100, Math.round((participantCount / progressMax) * 100))) : 0

  // ✅ 하드코딩 상세가 있으면 이걸 우선 렌더
  const hardcodedDetail = renderHardcodedDetail(teamId)

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mt-8 mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white">
          <div className="w-full bg-[#f3f3f3]">
            {team.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.image_url} alt={team.name ?? 'team'} className="w-full h-auto object-cover" />
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

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-[13px] text-[#7a7a7a]">Share this team with friends</div>
              <ShareButtonClient />
            </div>

            {/* ✅ 가격/할인 영역 */}
            <div
              className="mt-8 rounded-2xl px-6 py-8"
              style={{
                background: SKY_BLUE,
                color: '#0e0e0e',
              }}
            >
              <div className="mt-4 text-center">
                {basePrice > 0 ? (
                  <>
                    <div className="text-[14px] text-black/70">Current price</div>
                    <div className="mt-1 text-[30px] font-semibold">{formatMoney(discountedPrice, currency)}</div>
                    <div className="mt-1 text-[13px] text-black/70">
                      {participantCount} joined · {curDiscount}% discount
                      {minPrice > 0 ? ` · min ${formatMoney(minPrice, currency)}` : ''}
                    </div>
                  </>
                ) : (
                  <div className="text-[14px] text-black/70">Pricing not set yet. (Admin needs base price + steps)</div>
                )}
              </div>

              {progressMax > 0 ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-[12px] text-black/70">
                    <span>
                      {participantCount} / {progressMax}
                    </span>
                    <span>{progressPct}%</span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/15">
                    <div className="h-full bg-black/45" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              ) : null}

              {steps.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-xl border border-black/15" style={{ background: SKY_BLUE_LIGHT }}>
                  <div className="grid grid-cols-3 px-4 py-3 text-[13px] font-semibold text-[#0e0e0e]">
                    <div>Participants</div>
                    <div>Discount</div>
                    <div>Price</div>
                  </div>
                  <div className="divide-y divide-black/10">
                    {steps.map((s, idx) => {
                      const raw = Math.max(0, Math.round(basePrice * (1 - s.discount_percent / 100)))
                      const price = minPrice > 0 ? Math.max(minPrice, raw) : raw
                      const hit = participantCount >= s.participants

                      return (
                        <div
                          key={`${s.participants}_${idx}`}
                          className={[
                            'grid grid-cols-3 px-4 py-3 text-[13px]',
                            hit ? 'bg-black/5' : 'bg-transparent',
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

              <div className="mt-6 flex justify-center">
                <JoinButtonClient teamId={teamId} />
              </div>

              <div className="mt-3 text-center text-[12px] text-black/60"></div>
            </div>

            {/* ✅ 상세 영역: 하드코딩 우선, 없으면 기존 마크다운 */}
            {hardcodedDetail ? (
              hardcodedDetail
            ) : (
              <div className="mt-8 rounded-2xl border border-[#e9e9e9] bg-white p-6">
                <div className="text-[18px] font-semibold">{FALLBACK_DETAIL_TITLE}</div>

                {team.detail_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={team.detail_image_url}
                    alt="detail"
                    className="mt-4 w-full h-auto rounded-2xl object-cover"
                  />
                ) : null}

                <div className="mt-4 prose max-w-none prose-p:my-2 prose-li:my-1 prose-headings:mt-4 prose-headings:mb-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {team.detail_markdown || FALLBACK_DETAIL_TEXT}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            <div className="mt-10">
              <Link
                href="/team"
                className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2"
              >
                Back to TEAM →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
