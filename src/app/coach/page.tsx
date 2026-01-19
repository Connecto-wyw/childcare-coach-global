// src/app/coach/page.tsx (Server Component)
import Link from 'next/link'
import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import KeywordButtons from './KeywordButtons'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type NewsPostRow = {
  id: string
  title: string
  slug: string
  created_at: string | null
}

async function getRequestOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (!host) return null
  return `${proto}://${host}`
}

async function getPopularKeywords() {
  try {
    const origin = await getRequestOrigin()
    if (!origin) return null

    const res = await fetch(`${origin}/api/keywords`, { cache: 'no-store' })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) return null

    if (Array.isArray(json.keywords) && json.keywords.length > 0) {
      return json.keywords.map((k: any) => String(k)).filter(Boolean).slice(0, 4)
    }

    if (Array.isArray(json.data) && json.data.length > 0) {
      return json.data
        .map((row: any) => String(row.keyword))
        .filter(Boolean)
        .slice(0, 4)
    }

    return null
  } catch {
    return null
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
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })
}

export default async function CoachPage() {
  const supabase = await createSupabaseServer()

  const kw = await getPopularKeywords()
  const keywords =
    kw && kw.length > 0
      ? kw
      : [
          'Could my child have ADHD?',
          'Fun things to do at home this weekend',
          'How to handle a child’s fever',
          'How to discipline a child who won’t listen',
        ]

  const { data: newsRes, error: newsErr } = await supabase
    .from('news_posts')
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  const news: NewsPostRow[] = newsErr || !newsRes ? [] : (newsRes as NewsPostRow[])

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        {/* 타이틀 */}
        <section className="text-center mb-10">
          <div className="leading-tight">
            <div className="text-[23px] text-[#0e0e0e] font-medium">Ask me anything</div>
            <div className="text-[23px] text-[#0e0e0e] font-light">about parenting</div>
          </div>
        </section>

        {/* Popular ways */}
        <section className="mb-10">
          <div className="text-[13px] font-medium text-[#0e0e0e] mb-3">
            Popular ways to get started
          </div>
          <KeywordButtons keywords={keywords} />
        </section>

        {/* Chat */}
        <section className="mb-14">
          <ChatBox />
        </section>

        {/* Tips + News (스샷처럼 라이트 블루 카드 톤) */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-[13px] font-medium text-[#0e0e0e] mb-3">Today’s Parenting Tips</h3>

              <div className="space-y-4">
                {/* TipSection 내부가 카드들을 그리는 구조라면: TipSection은 그대로 두고, 바깥 래퍼만 톤 맞춤 */}
                <div className="bg-[#f0f7fd] p-4">
                  <TipSection />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-[#0e0e0e] mb-3">K-Parenting News</h3>

              <div className="bg-[#f0f7fd] p-4">
                {news.length === 0 ? (
                  <p className="text-[13px] font-medium text-[#b4b4b4]">No news available.</p>
                ) : (
                  <ul className="space-y-3">
                    {news.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={`/news/${n.slug}`}
                          className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2"
                          title={n.created_at ? new Date(n.created_at).toLocaleDateString('en-US') : undefined}
                        >
                          {n.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
