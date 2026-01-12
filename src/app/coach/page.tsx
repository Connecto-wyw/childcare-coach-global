// src/app/coach/page.tsx (Server Component)
import Link from 'next/link'
import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import KeywordButtons from './KeywordButtons'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type NewsPostRow = {
  id: string
  title: string
  slug: string
  created_at: string | null
}

async function getPopularKeywords() {
  try {
    // ✅ 핵심: 같은 도메인에서 /api/keywords 호출 (가장 안전)
    const res = await fetch('/api/keywords', { cache: 'no-store' })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok || !Array.isArray(json.keywords) || json.keywords.length === 0) return null
    return json.keywords.map((k: any) => String(k))
  } catch {
    return null
  }
}

export default async function CoachPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

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
    .returns<NewsPostRow[]>()

  const news: NewsPostRow[] = newsErr || !newsRes ? [] : newsRes

  return (
    <main className="min-h-screen bg-[#282828] text-white font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <section className="mb-8 text-center">
          <h2 className="text-[24px] font-semibold mb-3 text-white">
            "Ask me anything about parenting—I’m here to help."
          </h2>
          <KeywordButtons keywords={keywords} />
        </section>

        <ChatBox />

        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Today’s Parenting Tips</h3>
              <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a] p-4">
                <TipSection />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">K-Parenting News</h3>
              <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a] p-4">
                {news.length === 0 ? (
                  <p className="text-gray-300 text-sm">No news available.</p>
                ) : (
                  <ul className="space-y-3">
                    {news.map((n) => (
                      <li key={n.id} className="group">
                        <Link
                          href={`/news/${n.slug}`}
                          className="block text-gray-100 hover:text-[#3EB6F1] transition"
                          title={
                            n.created_at
                              ? new Date(n.created_at).toLocaleDateString('en-US')
                              : undefined
                          }
                        >
                          <span className="inline-block mr-2 text-xs text-gray-300 align-middle">
                            {n.created_at ? new Date(n.created_at).toLocaleDateString('en-US') : ''}
                          </span>
                          <span className="align-middle underline-offset-2 group-hover:underline">
                            {n.title}
                          </span>
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
