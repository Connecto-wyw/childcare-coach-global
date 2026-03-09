// src/app/kyk/page.tsx
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
        // 읽기 전용 페이지라 비워둠
      },
    },
  })
}

export default async function KYKHomePage() {
  const supabase = await getServerSupabase()

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user ?? null

  let latestResult: KYKResultRow | null = null

  if (user) {
    const { data } = await supabase
      .from('kyk_results')
      .select('computed, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<KYKResultRow>()

    latestResult = data ?? null
  }

  const computed = (latestResult?.computed ?? {}) as unknown as Computed
  const profile = computed.profile ?? {}
  const hasResult = !!latestResult

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          Know Your Kid · 아이 성향 분석
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        {!hasResult ? (
          <section className="mt-10">
            <div
              className="rounded-2xl border px-6 py-7"
              style={{ borderColor: BORDER, background: '#fff' }}
            >
              <div className="text-[22px] font-medium leading-tight">
                우리 아이 성향을 간단히 알아보는 테스트
              </div>

              <p className="mt-4 text-[14px] leading-relaxed" style={{ color: TEXT }}>
                KYK는 몇 가지 질문을 통해 아이의 기질과 반응 패턴을 가볍게 살펴보는
                성향 분석이야. 결과를 저장해두면 이후 AI 코치가 아이 성향을 반영해서
                더 맥락에 맞는 답변을 할 수 있어.
              </p>

              <div className="mt-6 space-y-3 text-[14px]" style={{ color: MUTED }}>
                <p>· 질문 수는 많지 않고 1~2분 정도면 끝나.</p>
                <p>· 로그인 없이 시작할 수 있지만, 결과 저장 단계에서 로그인이 필요할 수 있어.</p>
                <p>· 이미 결과가 있더라도 언제든 다시 해볼 수 있어.</p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/kyk/step1"
                  className="inline-block rounded-md px-4 py-2 text-[14px] font-medium"
                  style={{ background: BTN, color: 'white' }}
                >
                  지금 바로 하기
                </Link>

                <Link
                  href="/coach"
                  className="inline-block rounded-md border px-4 py-2 text-[14px] font-medium"
                  style={{ borderColor: BORDER, color: TEXT }}
                >
                  AI 코치로 가기
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-10">
            <div
              className="rounded-2xl border px-6 py-7"
              style={{ borderColor: BORDER, background: '#fff' }}
            >
              <div className="text-[13px] font-medium" style={{ color: MUTED }}>
                최근 저장된 결과
              </div>

              <div className="mt-3 text-[24px] font-medium leading-tight">
                {profile.title ?? '우리 아이 성향 결과'}
              </div>

              {profile.animal && (
                <div className="mt-2 text-[14px]" style={{ color: MUTED }}>
                  {profile.animal}
                </div>
              )}

              {profile.summary && (
                <p className="mt-5 text-[14px] leading-relaxed" style={{ color: TEXT }}>
                  {profile.summary}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/kyk/result"
                  className="inline-block rounded-md px-4 py-2 text-[14px] font-medium"
                  style={{ background: BTN, color: 'white' }}
                >
                  결과 페이지 보기
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
        )}
      </div>
    </main>
  )
}