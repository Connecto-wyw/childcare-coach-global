// src/app/news/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type NewsRow = {
  id: string
  title: string
  slug: string
  created_at: string | null
  cover_image_url: string | null
  // category 컬럼이 없을 수도 있어서 optional로 둠(있으면 사용)
  category?: string | null
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

function formatDate(d: string | null) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-US') // 10/28/2025
}

async function fetchNewsList(sb: Awaited<ReturnType<typeof createSupabaseServer>>) {
  // ✅ category 컬럼이 실제로 없을 가능성이 크니까:
  // 1) category 포함 select 시도
  // 2) 실패하면 category 없이 재시도
  const base = 'id, title, slug, created_at, cover_image_url'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySb: any = sb

  const try1 = await anySb
    .from('news_posts')
    .select(`${base}, category`)
    .order('created_at', { ascending: false })

  if (!try1?.error) {
    return (try1.data ?? []) as NewsRow[]
  }

  const try2 = await sb
    .from('news_posts')
    .select(base)
    .order('created_at', { ascending: false })

  if (try2.error) return []
  return (try2.data ?? []) as NewsRow[]
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-7 px-3 rounded bg-[#f2f2f2] text-[#8a8a8a] text-[13px] font-medium">
      {label}
    </span>
  )
}

export default async function NewsPage() {
  const supabase = await createSupabaseServer()
  const news = await fetchNewsList(supabase)

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[56px] leading-none font-bold">News</h1>
        <p className="mt-3 text-[16px] text-[#b4b4b4]">
          Curated parenting research &amp; book notes.
        </p>

        <div className="mt-10 border-t border-[#eeeeee]">
          {news.length === 0 ? (
            <div className="py-16 text-[#b4b4b4] text-[15px] font-medium">
              No news available.
            </div>
          ) : (
            <ul>
              {news.map((n) => {
                const date = formatDate(n.created_at)
                const category = (n.category && String(n.category).trim()) || 'Research'
                const cover = n.cover_image_url ? String(n.cover_image_url).trim() : ''

                return (
                  <li key={n.id} className="border-b border-[#eeeeee]">
                    <Link
                      href={`/news/${n.slug}`}
                      className="block py-12 hover:bg-[#fafafa] transition"
                    >
                      <div className="flex flex-col sm:flex-row gap-8">
                        {/* 썸네일(회색 영역 = 어드민 등록 이미지 노출) */}
                        <div className="w-full sm:w-[220px]">
                          <div className="w-full aspect-square bg-[#d9d9d9] overflow-hidden">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cover}
                                alt={n.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                        </div>

                        {/* 텍스트 영역 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4">
                            <CategoryPill label={category} />
                            <div className="text-[15px] text-[#b4b4b4] font-medium">
                              {date}
                            </div>
                          </div>

                          <h2 className="mt-4 text-[34px] leading-tight font-semibold line-clamp-2">
                            {n.title}
                          </h2>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
