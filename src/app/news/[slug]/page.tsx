// src/app/news/[slug]/page.tsx (Server Component)
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

type NewsPostRow = {
  id: string
  title: string
  slug: string
  content: string | null
  created_at: string | null
}

type PageProps = {
  params: { slug: string }
}

export default async function NewsDetailPage({ params }: PageProps) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const slug = params.slug

  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, content, created_at')
    .eq('slug', slug)
    .single<NewsPostRow>()

  // ✅ Vercel 로그에서도 확인 가능
  console.error('[news_detail]', { slug, error, hasData: !!data })

  // ✅ 개발/디버깅용: 에러를 화면에 노출해서 원인 확정
  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>News detail error</h1>
        <pre>{JSON.stringify({ slug, error }, null, 2)}</pre>
      </main>
    )
  }

  if (!data) return notFound()

  return (
    <main className="min-h-screen bg-[#282828] text-[#eae3de] font-sans">
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-xl font-bold mb-2">{data.title}</h1>

        <p className="text-sm text-gray-400 mb-6">
          {data.created_at ? new Date(data.created_at).toLocaleString() : ''}
        </p>

        <article className="prose prose-invert max-w-none leading-7">
          {data.content ?? ''}
        </article>
      </div>
    </main>
  )
}