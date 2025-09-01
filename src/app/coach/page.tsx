// src/app/coach/page.tsx  (Server Component)
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

  // 인기 키워드 4개
  const { data: kwRes, error: kwErr } = await supabase
    .from('popular_keywords')
    .select('keyword, "order"')
    .order('order', { ascending: true })
    .limit(4)

  const keywords =
    kwErr || !kwRes || kwRes.length === 0
      ? ['수면', '식습관', '학습', '정서']
      : kwRes.map((k) => String(k.keyword))

  // 뉴스 최대 3개
  const { data: newsRes, error: newsErr } = await supabase
    .from('news_posts')
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  const news = newsErr || !newsRes ? [] : newsRes

  return (
    <main className="min-h-screen bg-[#282828] text-white font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        {/* 요즘 인기 키워드 */}
        <section className="mb-8 text-center">
          <h2 className="text-lg font-semibold mb-3">Hot Keywords</h2>
          <KeywordButtons keywords={keywords} />
        </section>

        {/* 대화 영역 */}
            <ChatBox />
          

        {/* 오늘의 팁 + 육아&교육 뉴스 */}
        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 오늘의 육아 팁 */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Today’s Parenting Tips</h3>
              <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a] p-4">
                <TipSection />
              </div>
            </div>

            {/* 육아&교육 뉴스 */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Global News</h3>
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
                              ? new Date(n.created_at).toLocaleDateString('ko-KR')
                              : undefined
                          }
                        >
                          <span className="inline-block mr-2 text-xs text-gray-300 align-middle">
                            {n.created_at
                              ? new Date(n.created_at).toLocaleDateString('ko-KR')
                              : ''}
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
