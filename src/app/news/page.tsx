// src/app/news/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

type NewsPostRow = {
  id: string
  title: string
  slug: string
  created_at: string | null
}

export default async function NewsPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })
    .returns<NewsPostRow[]>()

  const newsList: NewsPostRow[] = error || !data ? [] : data

  return (
    <main className="min-h-screen bg-[#282828] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">News</h1>

        {newsList.length === 0 ? (
          <p className="text-gray-300">No news available.</p>
        ) : (
          <ul className="space-y-4">
            {newsList.map((post) => (
              <li key={post.id} className="border-b border-gray-600 pb-2">
                <Link
                  href={`/news/${post.slug}`}
                  className="text-lg text-[#3EB6F1] hover:underline"
                >
                  {post.title}
                </Link>
                <div className="text-xs text-gray-400 mt-1">
                  {post.created_at ? new Date(post.created_at).toLocaleDateString('en-US') : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
