export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

function asObject(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value !== 'object') return {}
  if (Array.isArray(value)) return {}
  return value as Record<string, any>
}

type KYKResultRow = Pick<
  Database['public']['Tables']['kyk_results']['Row'],
  'color' | 'profile' | 'created_at'
>

export default async function KYKResultPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <main className="min-h-screen bg-white" style={{ color: TEXT }}>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-[24px] font-medium">KYK Result</h1>
          <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
            로그인이 필요해요.
          </p>
          <div className="mt-6">
            <Link href="/kyk" className="text-[14px]" style={{ color: BTN }}>
              Go to KYK
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ✅ 타입이 꼬이면 never가 뜨니까, Row 타입을 명시해서 받는다.
  const { data, error } = await supabase
    .from('kyk_results')
    .select('color, profile, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<KYKResultRow>()

  if (error) {
    return (
      <main className="min-h-screen bg-white" style={{ color: TEXT }}>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-[24px] font-medium">KYK Result</h1>
          <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
            결과를 불러오지 못했어요.
          </p>
          <p className="mt-2 text-[13px]" style={{ color: '#d00' }}>
            {error.message}
          </p>
          <div className="mt-6">
            <Link href="/coach" className="text-[14px]" style={{ color: BTN }}>
              Go to Coach
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const profile = asObject(data?.profile)

  const title = String(profile.title ?? 'Your child type')
  const desc = String(profile.description ?? 'We are preparing a detailed result.')
  const keywords = Array.isArray(profile.parent_keywords)
    ? (profile.parent_keywords as string[])
    : ['How to support this type?', 'Daily routine tips', 'Social skills guidance']

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK Result</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          Top 1 only (code hidden)
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-10">
          <div className="text-[20px] font-semibold">{title}</div>

          <p className="mt-4 text-[14px] leading-relaxed" style={{ color: TEXT }}>
            {desc}
          </p>

          <div className="mt-10">
            <div className="text-[14px] font-medium" style={{ color: MUTED }}>
              Parents often ask:
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.slice(0, 3).map((k) => (
                <Link
                  key={k}
                  href={`/coach?q=${encodeURIComponent(k)}`}
                  className="rounded-full border px-3 py-2 text-[13px]"
                  style={{ borderColor: BORDER }}
                >
                  {k}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-10">
          <Link href="/coach" className="text-[14px]" style={{ color: BTN }}>
            Go to Coach
          </Link>
        </div>
      </div>
    </main>
  )
}