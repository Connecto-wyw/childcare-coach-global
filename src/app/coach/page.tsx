'use client'

import { useEffect, useState } from 'react'
import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import { supabase } from '@/lib/supabaseClient'

export default function CoachPage() {
  const [keywords, setKeywords] = useState<string[]>([])

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

  const fill = (kw: string) => {
    window.dispatchEvent(new CustomEvent('coach:setMessage', { detail: kw }))
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <section className="mb-8 text-center">
          <h2 className="text-lg font-semibold mb-3">요즘 인기 키워드</h2>
          <div className="flex justify-center gap-3 flex-wrap">
            {keywords.map((kw) => (
              <button
                key={kw}
                onClick={() => fill(kw)}
                className="bg-gray-200 text-[var(--foreground)] text-sm px-4 py-1 rounded hover:opacity-90 transition"
              >
                {kw}
              </button>
            ))}
          </div>
        </section>

        <ChatBox />

        <section className="mt-12 text-center max-w-xl mx-auto">
          <TipSection />
        </section>
      </div>
    </main>
  )
}
