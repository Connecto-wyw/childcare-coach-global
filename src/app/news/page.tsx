// src/app/news/page.tsx (Server Component)
import Link from 'next/link'
import { cookies as nextCookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type NewsPostRow = {
  id: string
  title: string | null
  slug: string | null
  created_at: string | null
}

export default async function NewsPage() {
  // Next 16: cookies()가 Promise일 수 있으니 await로 cookieStore 확보
  const cookieStore = await nextCookies()

  const supabase = createServerComponentClient<Database>({
    // ✅ 핵심: Promise<ReadonlyRequestCookies> 형태로 리턴
    cookies: async () => cookieStore,
    // 또는 cookies: () => Promise.resolve(cookieStore),
  })

  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-[#282828] text-[#eae3de] font-sans">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-6">News</h1>
          <p className="text-red-300">News load error: {error.message}</p>
        </div>
      </main>
    )
  }

  const newsList = (data ?? []) as NewsPostRow[]

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
                {post.slug ? (
                  <Link
                    href={`/news/${post.slug}`}
                    className="text-lg text-[#3EB6F1] hover:underline"
                  >
                    {post.title ?? '(no title)'}
                  </Link>
                ) : (
                  <div className="text-lg text-[#3EB6F1]">
                    {post.title ?? '(no title)'}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-1">
                  {post.created_at
                    ? new Date(post.created_at).toLocaleDateString('en-US')
                    : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
