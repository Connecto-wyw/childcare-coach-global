// src/app/news/[slug]/page.tsx
export const dynamic = 'force-dynamic'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Database } from '@/lib/database.types'

type Params = { params: { slug: string } }

export async function generateMetadata({ params }: Params) {
  return { title: `뉴스 | ${params.slug}` }
}

export default async function Page({ params }: Params) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data, error } = await supabase
    .from('news_posts')
    .select('id,title,slug,content,created_at')
    .eq('slug', params.slug)
    .single()

  if (error || !data) notFound()

  return (
    <div className="min-h-screen bg-[#282828] text-white px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{data.title}</h1>
        <p className="text-sm text-gray-400 text-right mb-6">
          {new Date(data.created_at).toLocaleDateString()}
        </p>
        <div className="whitespace-pre-wrap text-base text-gray-100">
          {data.content}
        </div>
      </div>
    </div>
  )
}
