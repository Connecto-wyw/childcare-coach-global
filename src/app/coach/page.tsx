// src/app/coach/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import KeywordButtons from './KeywordButtons'
import type { Database } from '@/lib/database.types'

export default async function CoachPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  // Top keywords (up to 4)
  const { data: kwRes, error: kwErr } = await supabase
    .from('popular_keywords')
    .select('keyword, "order"')
    .order('order', { ascending: true })
    .limit(4)

  const keywords =
    kwErr || !kwRes || kwRes.length === 0
      ? [
          'Could my child have ADHD?',
          'Fun things to do at home this weekend',
          'How to handle a child’s fever',
          'How to discipline a child who won’t listen',
        ]
      : kwRes.map((k) => String(k.keyword))

  // Latest news (up to 3)
  const { data: newsRes, error: newsErr } = await supabase
    .from('news_posts')
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  const news = newsErr || !newsRes ? [] : newsRes

  return (
    <main className="min-h-screen bg-[#282828] text-white font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        {/* HOT KEYWORDS */}
        <section className="mb-8 text-center">
          <h2 className="text-[27px] font-semibold mb-3 text-yellow-200">Hot Keywords</h2>
          <KeywordButtons keywords={keywords} />
        </section>

        {/* Chat */}
        <ChatBox />

        {/* Today’s Tips + K-Parenting News */}
        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today’s Parenting Tips */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Today’s Parenting Tips</h3>
              <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a] p-4">
                <TipSection />
              </div>
            </div>

            {/* Parenting & Education News */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Parenting & Education News</h3>
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
