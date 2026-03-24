// src/app/coach/page.tsx (Server Component)
import Link from 'next/link'
import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import HeroGreeting from '@/components/coach/HeroGreeting'
import KeywordButtons from './KeywordButtons'
import ScrollToTop from './ScrollToTop'

import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import ActiveTeamsGrid, { type TeamCard } from '@/components/team/ActiveTeamsGrid'
import FeaturedTeamsRow from '@/components/coach/FeaturedTeamsRow'
import { getDictionary, getLocale } from '@/i18n'
import { resolveI18n } from '@/lib/i18nFallback'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type NewsPostRow = {
  id: string
  title: string
  slug: string
  created_at: string | null
  cover_image_url?: string | null
  title_i18n?: any
}

type TeamRow = Pick<
  Database['public']['Tables']['teams']['Row'],
  'id' | 'name' | 'image_url' | 'tag1' | 'tag2' | 'created_at' | 'is_active'
>

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

async function getRequestOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (!host) return null
  return `${proto}://${host}`
}

function buildTeamImageUrl(image_url: string | null) {
  if (!image_url) return null
  const raw = String(image_url).trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  if (!supabaseUrl) return raw

  const path = raw.replace(/^\//, '')
  return `${stripTrailingSlash(supabaseUrl)}/storage/v1/object/public/team-images/${path}`
}

function mapTeamRowToCard(row: TeamRow): TeamCard {
  const tags = [row.tag1, row.tag2].filter((x): x is string => Boolean(x && String(x).trim()))
  return {
    id: row.id,
    name: row.name,
    imageUrl: buildTeamImageUrl(row.image_url),
    tags,
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
        // Server Component에서 cookie set이 실패할 수 있어도 페이지 렌더는 계속
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

/**
 * ✅ Coach에서 보여줄 키워드는 "어드민에서 등록한 것"만 사용.
 * - GET /api/keywords 는 공개 읽기
 * - 응답 형식: { ok: true, data: [{ id, keyword, order }, ...] }
 */
async function getPopularKeywords(locale: string) {
  try {
    const origin = await getRequestOrigin()
    if (!origin) return null

    const res = await fetch(`${origin}/api/keywords`, { cache: 'no-store' })
    if (!res.ok) return null

    const json = (await res.json().catch(() => null)) as any
    const rows = json && Array.isArray(json.data) ? json.data : []

    const list = rows
      .map((row: any) => {
        let text = row.keyword
        if (row.keyword_i18n && typeof row.keyword_i18n === 'object') {
          if (row.keyword_i18n[locale]) {
            text = row.keyword_i18n[locale]
          } else if (locale !== 'en' && row.keyword_i18n['en']) {
            text = row.keyword_i18n['en']
          }
        }
        return String(text ?? '').trim()
      })
      .filter(Boolean)
      .slice(0, 4)

    return list.length > 0 ? list : null
  } catch {
    return null
  }
}

async function getFeaturedTeams(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data, error } = await (supabase as any)
    .from('community_teams')
    .select('id, name, purposes')
    .eq('is_featured', true)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error || !data) return []
  return (data as { id: string; name: string; purposes: string[] }[]).map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl: null,
    tags: row.purposes ?? [],
  }))
}

async function getOngoingTeams(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, image_url, tag1, tag2, created_at, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error || !data) return []
  return (data as TeamRow[]).map(mapTeamRowToCard)
}

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const prefillRaw = resolvedParams?.prefill
  const initialPrefill = typeof prefillRaw === 'string' ? prefillRaw : undefined

  const supabase = await createSupabaseServer()
  const locale = await getLocale()
  const t = await getDictionary('coach')

  // KYK 완료 여부 확인
  const { data: userData } = await supabase.auth.getUser()
  const coachUser = userData?.user ?? null
  let hasKYK = false
  if (coachUser) {
    const { data: kykData } = await supabase
      .from('kyk_results')
      .select('id')
      .eq('user_id', coachUser.id)
      .limit(1)
      .maybeSingle()
    hasKYK = !!kykData
  }

  // ✅ 어드민 등록 키워드만 사용 (없으면 섹션 숨김)
  const kw = await getPopularKeywords(locale)
  const keywords = kw && kw.length > 0 ? kw : []

  const { data: newsRes, error: newsErr } = await supabase
    .from('news_posts')
    .select('id, title, title_i18n, slug, created_at, cover_image_url')
    .order('created_at', { ascending: false })
    .limit(3)

  const rawNews = newsErr || !newsRes ? [] : (newsRes as NewsPostRow[])
  const news: NewsPostRow[] = rawNews.map((n) => ({
    ...n,
    title: resolveI18n(n.title, n.title_i18n, locale),
  }))

  const [featuredTeams, ongoingTeams] = await Promise.all([
    getFeaturedTeams(supabase),
    getOngoingTeams(supabase),
  ])

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e] pb-[160px]">
      <ScrollToTop />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex justify-center mb-4">
          <Logo locale={locale} />
        </div>

        <HeroGreeting hello={t.hello} subtitle={t.subtitle} />

        {/* ✅ 키워드가 있을 때만 노출 */}
        {keywords.length > 0 ? (
          <section className="mb-3">
            <div className="text-[15px] font-bold text-[#0e0e0e] mb-3">{t.people_asking}</div>
            <KeywordButtons keywords={keywords} />
          </section>
        ) : null}

        <section className="mb-8">
          {/* ✅ 게스트/로그인 모두 가능. ChatBox 내부에서 로그인 강제하면 안 됨 */}
          <ChatBox initialPrefill={initialPrefill} hasKYK={hasKYK} />
        </section>

        {featuredTeams.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 text-[15px] font-bold text-[#0e0e0e]">{t.featured_teams}</div>
            <FeaturedTeamsRow teams={featuredTeams} />
          </section>
        )}

        <section className="mb-8">
          <div className="mb-3 text-[15px] font-bold text-[#0e0e0e]">{t.ongoing_teams}</div>
          <ActiveTeamsGrid teams={ongoingTeams} />
        </section>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* (1) K-Parenting News -> 왼쪽 */}
            <div>
              <h3 className="text-[15px] font-bold text-[#0e0e0e] mb-3">{t.k_parenting_news}</h3>

              <div className="bg-[#f0f7fd] p-4">
                {news.length === 0 ? (
                  <p className="text-[15px] font-medium text-[#b4b4b4]">{t.no_news}</p>
                ) : (
                  <ul className="space-y-3">
                    {news.map((n) => (
                      <li key={n.id} className="flex items-start gap-3">
                        {n.cover_image_url ? (
                          <img
                            src={String(n.cover_image_url)}
                            alt=""
                            className="mt-0.5 w-10 h-10 rounded object-cover border border-[#e6eef7]"
                            loading="lazy"
                          />
                        ) : null}

                        <div className="min-w-0">
                          <Link
                            href={`/news/${n.slug}`}
                            className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2"
                            title={n.created_at ? new Date(n.created_at).toLocaleDateString('en-US') : undefined}
                          >
                            {n.title}
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* (2) Today’s Parenting Tips -> 오른쪽 */}
            <div>
              <h3 className="text-[15px] font-bold text-[#0e0e0e] mb-3">{t.todays_tips}</h3>
              <div className="bg-[#f0f7fd] p-4">
                <TipSection tips={Array.isArray(t.tips) ? t.tips : undefined} />
              </div>
            </div>
          </div>
        </section>

        <div aria-hidden className="h-[160px] bg-white" />
      </div>
    </main>
  )
}