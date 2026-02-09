// src/app/auth/auth-code-error/page.tsx
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const msg = searchParams?.message ? decodeURIComponent(searchParams.message) : 'Unknown auth error.'

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="max-w-2xl mx-auto px-4 py-14">
        <h1 className="text-[22px] font-semibold">Login error</h1>

        <p className="mt-3 text-[14px] text-[#444]">
          로그인 처리 중 문제가 발생했어. 아래 메시지를 확인해.
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
