// src/app/news/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
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

function formatDate(created_at: string | null) {
  if (!created_at) return ''
  try {
    return new Date(created_at).toLocaleDateString('en-US')
  } catch {
    return ''
  }
}

export default async function NewsPage() {
  const supabase = await createSupabaseServer()

  const { data, error } = await supabase
    .from('news_posts')
    // ✅ 네 coach 메인과 동일하게 "존재 확정 컬럼"만 select (컴파일/런타임 안전)
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const posts: NewsPostRow[] = error || !data ? [] : (data as NewsPostRow[])

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e] pb-28">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ✅ coach 메인 톤: 큰 제목 + 여백 */}
        <section className="mb-10">
          <h1 className="text-[48px] font-semibold tracking-tight leading-none">News</h1>
          <p className="mt-3 text-[15px] font-medium text-[#b4b4b4]">
            Curated parenting research & book notes.
          </p>
        </section>

        {/* ✅ coach 메인 톤: 연한 블루 섹션 박스 */}
        <section className="bg-[#f0f7fd] p-4 md:p-6">
          {posts.length === 0 ? (
            <p className="text-[13px] font-medium text-[#b4b4b4]">No news available.</p>
          ) : (
            <ul className="space-y-4">
              {posts.map((p) => (
                <li key={p.id}>
                  {/* ✅ 카드 톤: 미니멀 + border + 라운드 */}
                  <Link
                    href={`/news/${p.slug}`}
                    className={[
                      'block',
                      'bg-white',
                      'border border-[#eeeeee]',
                      'rounded-2xl',
                      'p-4 md:p-5',
                      'transition',
                      'hover:bg-black/[0.02]',
                    ].join(' ')}
                  >
                    {/* 상단 라벨 (스크린샷의 Research/Book Review 느낌을 “톤만” 맞춤) */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-black/5 text-[12px] font-medium text-[#1e1e1e]">
                        Research
                      </span>
                      <span className="text-[13px] font-medium text-[#b4b4b4]">{formatDate(p.created_at)}</span>
                    </div>

                    {/* 제목: coach의 링크 블루 유지 */}
                    <div className="text-[20px] md:text-[22px] font-semibold text-[#0e0e0e] leading-snug">
                      {p.title}
                    </div>

                    <div className="mt-2">
                      <span className="text-[#3497f3] text-[15px] font-medium hover:underline underline-offset-2">
                        Read →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
