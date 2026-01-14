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
  // ✅ Next.js 15: cookies()는 Promise라서 먼저 await로 cookieStore를 꺼내야 함
  const cookieStore = await nextCookies()

  // ✅ auth-helpers가 내부에서 cookies().get(...)을 호출하니까
  //    "쿠키 객체를 리턴하는 함수"를 직접 만들어서 넣어준다
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
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
