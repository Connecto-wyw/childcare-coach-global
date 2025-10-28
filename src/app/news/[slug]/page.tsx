// src/app/news/[slug]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page({ params }: { params: { slug: string } }) {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, content, created_at')
    .eq('slug', params.slug)
    .single()

  if (!data || error) {
    return (
      <div className="min-h-screen bg-[#282828] text-red-400 px-4 py-12">
        뉴스를 찾을 수 없습니다{error?.message ? `: ${error.message}` : '.'}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#282828] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
        <p className="text-sm text-gray-400 mb-6">
          {new Date(data.created_at).toLocaleString()}
        </p>
        <article className="whitespace-pre-wrap text-base text-gray-200 leading-7">
          {data.content}
        </article>
      </div>
    </main>
  )
}
