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

  if (error || !data) return notFound()

  return (
    <main className="min-h-screen bg-[#282828] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{data.title}</h1>

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
