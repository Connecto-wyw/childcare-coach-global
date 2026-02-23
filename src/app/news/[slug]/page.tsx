// src/app/news/[slug]/page.tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type PageProps = { params: { slug: string } }

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ 서버에서만
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export default async function NewsDetailPage({ params }: PageProps) {
  const supabase = admin()

  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, content, created_at')
    .eq('slug', params.slug)
    .maybeSingle()

  // ✅ 404로 숨기지 말고, 일단 화면에 이유를 찍자
  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>News detail query error</h1>
        <pre>{JSON.stringify({ slug: params.slug, error }, null, 2)}</pre>
      </main>
    )
  }

  if (!data) {
    return (
      <main style={{ padding: 24 }}>
        <h1>News not found in DB</h1>
        <pre>{JSON.stringify({ slug: params.slug }, null, 2)}</pre>
      </main>
    )
  }

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