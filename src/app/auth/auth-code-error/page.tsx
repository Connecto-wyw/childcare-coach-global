// src/app/auth/auth-code-error/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // ✅ 서버에서 현재 세션(로그인 상태) 확인
  const cookieStore = await cookies()

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      // page에서는 set/remove 필요 없지만 타입 때문에 넣어둠
      set() {},
      remove() {},
    },
  })

  const { data } = await supabase.auth.getUser()
  const user = data?.user

  // ✅ 이미 로그인 된 상태면 에러 페이지 보여주지 말고 코치로 돌려보냄
  if (user) redirect('/coach')

  // ✅ message가 없으면 'Unknown' 대신 자연스러운 문구로
  const msgRaw = searchParams?.message
  const msg = msgRaw && msgRaw.trim().length > 0 ? msgRaw : 'Authentication completed. Please try again.'

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="max-w-2xl mx-auto px-4 py-14">
        <h1 className="text-[22px] font-semibold">Login error</h1>

        <p className="mt-3 text-[14px] text-[#444]">
          There was an issue during sign-in. If you’re already signed in, go back to Coach.
        </p>

        <pre className="mt-4 whitespace-pre-wrap rounded border border-[#e6e6e6] bg-[#fafafa] p-4 text-[13px]">
          {msg}
        </pre>

        <div className="mt-6 flex gap-3">
          <Link
            href="/coach"
            className="px-3 py-2 rounded bg-black text-white text-[14px] font-semibold"
          >
            Back to Coach
          </Link>
          <Link
            href="/"
            className="px-3 py-2 rounded border border-[#ddd] text-[14px] font-semibold"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}
