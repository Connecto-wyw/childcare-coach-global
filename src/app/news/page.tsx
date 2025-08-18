'use client'

import { useEffect, useState } from 'react'
import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type News = { id: string; title: string; slug: string; created_at: string }

export default function CoachPage() {
  const [keywords, setKeywords] = useState<string[]>([])
  const [news, setNews] = useState<News[]>([])

  useEffect(() => {
    async function fetchKeywords() {
      const { data, error } = await supabase
        .from('popular_keywords')
        .select('keyword')
        .order('order', { ascending: true })
        .limit(4)
      if (!error && data) setKeywords(data.map((k) => k.keyword))
    }
    fetchKeywords()
  }, [])

  // 어드민과 동일 소스: news_posts 에서 최근 3개
  useEffect(() => {
    async function fetchNews() {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, slug, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
      if (!error && data) setNews(data as News[])
    }
    fetchNews()
  }, [])

  const fill = (kw: string) => {
    window.dispatchEvent(new CustomEvent('coach:setMessage', { detail: kw }))
  }

  return (
    <main className="min-h-screen bg-[#282828] text-[var(--foreground)] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <section className="mb-8 text-center">
          <h2 className="text-lg font-semibold mb-3 text-white">요즘 인기 키워드</h2>
          <div className="flex justify-center gap-3 flex-wrap">
            {keywords.map((kw) => (
              <button
                key={kw}
                onClick={() => fill(kw)}
                className="bg-[#3a3a3a] text-white text-sm font-bold px-4 py-1 rounded hover:opacity-90 transition"
              >
                {kw}
              </button>
            ))}
          </div>
        </section>

        <ChatBox />

        {/* 오늘의 팁 + 뉴스: 타이틀은 박스 밖, 두 박스 동일 색상 */}
        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-white">오늘의 육아 팁</h3>
              <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a] p-4">
                <TipSection />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-white">육아&교육 뉴스</h3>
              <div className="rounded-2xl border border-gray-700 bg-[#3a3a3a] p-4">
                {news.length === 0 ? (
                  <p className="text-gray-300 text-sm">뉴스가 없습니다.</p>
                ) : (
                  <ul className="space-y-3">
                    {news.map((n) => (
                      <li key={n.id} className="group">
                        {/* 상세: /news/[slug] */}
                        <Link
                          href={`/news/${n.slug}`}
                          className="block text-gray-100 hover:text-[#3EB6F1] transition"
                          title={new Date(n.created_at).toLocaleDateString()}
                        >
                          <span className="inline-block mr-2 text-xs text-gray-300 align-middle">
                            {new Date(n.created_at).toLocaleDateString()}
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
