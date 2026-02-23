import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type PageProps = {
  params: { slug: string }
}

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export default async function NewsDetailPage({ params }: PageProps) {
  const supabase = supabaseAnon()

  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, content, created_at')
    .eq('slug', params.slug)
    .single()

  if (error || !data) return notFound()

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