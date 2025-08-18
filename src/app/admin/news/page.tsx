// src/app/news/page.tsx
import Link from 'next/link'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export default async function NewsPage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-[#282828] p-4 text-red-400">
        뉴스 목록을 불러올 수 없습니다.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#282828] text-white px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">육아 & 교육 뉴스</h1>
        {(!data || data.length === 0) ? (
          <p className="text-gray-400">아직 뉴스가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {data.map(post => (
              <li key={post.id} className="border-b border-gray-700 pb-2 flex justify-between">
                <Link href={`/news/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
                <span className="text-sm text-gray-400">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
