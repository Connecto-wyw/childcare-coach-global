// src/app/news/[slug]/page.tsx
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { resolveI18n } from '@/lib/i18nFallback'
import { getLocale, getDictionary } from '@/i18n'

type PageProps = {
  params: Promise<{ slug: string }>
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버에서만
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function formatDateTime(d: string | null) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleString()
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params // ✅ Next 15 핵심
  if (!slug || typeof slug !== 'string') return notFound()

  const supabase = admin()

  const { data: rawData, error } = await supabase
    .from('news_posts')
    .select('id, title, title_i18n, slug, content, content_i18n, created_at')
    .eq('slug', slug)
    .maybeSingle()

  type NewsPost = {
    id: string
    title: string | null
    title_i18n: Record<string, string> | null
    slug: string
    content: string | null
    content_i18n: Record<string, string> | null
    created_at: string | null
  }
  const data = rawData as unknown as NewsPost

  if (error) {
    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[22px] font-semibold">News detail query error</h1>
          <pre className="mt-4 text-[12px] bg-[#f6f6f6] p-4 rounded overflow-auto">
            {JSON.stringify({ slug, error }, null, 2)}
          </pre>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[22px] font-semibold">News not found in DB</h1>
          <pre className="mt-4 text-[12px] bg-[#f6f6f6] p-4 rounded overflow-auto">
            {JSON.stringify({ slug }, null, 2)}
          </pre>
        </div>
      </main>
    )
  }

  const locale = await getLocale()
  const t = await getDictionary('news')
  const resolvedTitle = resolveI18n(data.title ?? '', data.title_i18n as Record<string, string>, locale)
  const resolvedContent = resolveI18n(data.content ?? '', data.content_i18n as Record<string, string>, locale)

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-[28px] sm:text-[34px] font-semibold leading-tight">
          {resolvedTitle}
        </h1>

        <p className="mt-2 text-[14px] text-[#8a8a8a]">
          {formatDateTime(data.created_at)}
        </p>

        <div className="mt-8 border-t border-[#eeeeee] pt-8">
          {/* ✅ plain text 줄바꿈/문단 살리기 */}
          <article className="whitespace-pre-wrap leading-7 text-[16px]">
            {resolvedContent ?? ''}
          </article>
        </div>

        <div className="mt-10 border-t border-[#eeeeee] pt-6">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3497f3] border border-[#3497f3] rounded-md px-4 py-2 hover:bg-[#f0f7fd] transition-colors"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
            {t.news_list}
          </Link>
        </div>
      </div>
    </main>
  )
}