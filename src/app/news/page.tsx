// src/app/news/page.tsx
import Link from 'next/link'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NewsPage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: newsList, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-[#282828] text-red-400 px-4 py-12">
        뉴스 목록을 불러올 수 없습니다: {error.message}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#282828] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">NEWS</h1>
        {!newsList?.length ? (
          <p className="text-gray-400">게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {newsList.map((post) => (
              <li key={post.id} className="border-b border-gray-600 pb-2">
                <Link href={`/news/${post.slug}`} className="text-lg text-[#3EB6F1] hover:underline">
                  {post.title}
                </Link>
                <p className="text-sm text-gray-400">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
