// src/app/kyk/result/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

type KYKResultRow = Pick<
  Database['public']['Tables']['kyk_results']['Row'],
  'computed' | 'created_at'
>

type Computed = {
  primary_type?: string
  color?: string
  profile?: {
    animal?: string
    title?: string
    summary?: string
    keywords?: string[]
  }
}

async function getServerSupabase() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

  return createServerClient<Database>(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // 결과 조회 페이지에서는 Set-Cookie가 꼭 필요하지 않아서 비워둠
      },
    },
  })
}

export default async function KYKResultPage() {
  const supabase = await getServerSupabase()

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <main className="min-h-screen bg-white" style={{ color: TEXT }}>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
          <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
            결과를 보려면 로그인이 필요해.
          </p>

          <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

          <Link
            href="/kyk/gate"
            className="mt-8 inline-block rounded-md px-4 py-2 text-[14px] font-medium"
            style={{ background: BTN, color: 'white' }}
          >
            Go to Login
          </Link>
        </div>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('kyk_results')
    .select('computed, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<KYKResultRow>()

  if (error || !data) {
    return (
      <main className="min-h-screen bg-white" style={{ color: TEXT }}>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
          <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
            결과를 불러오지 못했어.
          </p>

          <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

          <p className="mt-8 text-[13px]" style={{ color: '#d00' }}>
            {error?.message ?? 'No result found.'}
          </p>

          <Link
            href="/kyk/step1?restart=1"
            className="mt-8 inline-block rounded-md px-4 py-2 text-[14px] font-medium"
            style={{ background: BTN, color: 'white' }}
          >
            Take KYK Test Again
          </Link>
        </div>
      </main>
    )
  }

  const computed = (data.computed ?? {}) as unknown as Computed
  const profile = computed.profile ?? {}
  const keywords = Array.isArray(profile.keywords) ? profile.keywords.slice(0, 3) : []

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          우리 아이 성향 결과(1위)
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-10">
          <div className="rounded-lg border p-6" style={{ borderColor: BORDER }}>
            <div className="text-[14px] font-medium" style={{ color: MUTED }}>
              {profile.animal ?? 'Result'}
            </div>

            <div className="mt-2 text-[22px] font-medium leading-tight">
              {profile.title ?? '성향 결과를 표시할 수 없어'}
            </div>

            {profile.summary && (
              <p className="mt-4 text-[14px] leading-relaxed" style={{ color: TEXT }}>
                {profile.summary}
              </p>
            )}

            {keywords.length > 0 && (
              <div className="mt-6">
                <div className="text-[13px] font-medium" style={{ color: MUTED }}>
                  이 성향 부모님이 자주 궁금해하는 키워드
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <Link
                      key={k}
                      href={`/coach?prefill=${encodeURIComponent(k)}`}
                      className="rounded-full border px-3 py-1 text-[13px]"
                      style={{ borderColor: BORDER }}
                    >
                      {k}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/coach"
                className="inline-block rounded-md px-4 py-2 text-[14px] font-medium"
                style={{ background: BTN, color: 'white' }}
              >
                Go to AI Coach
              </Link>

              <Link
                href="/kyk/step1?restart=1"
                className="inline-block rounded-md border px-4 py-2 text-[14px] font-medium"
                style={{ borderColor: BORDER, color: TEXT }}
              >
                다시 해보기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}