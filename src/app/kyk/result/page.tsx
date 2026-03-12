// src/app/kyk/result/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { getDictionary } from '@/i18n'

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
  
  // NOTE: i18n
  const dict = await getDictionary('kyk')

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <main className="min-h-screen bg-white" style={{ color: TEXT }}>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-[24px] font-medium leading-tight">{dict.result.title}</h1>
          <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
            {dict.result.login_required}
          </p>

          <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

          <Link
            href="/kyk/gate"
            className="mt-8 inline-block rounded-md px-4 py-2 text-[14px] font-medium"
            style={{ background: BTN, color: 'white' }}
          >
            {dict.result.btn_login}
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
          <h1 className="text-[24px] font-medium leading-tight">{dict.result.title}</h1>
          <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
            {dict.result.failed_load}
          </p>

          <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

          <p className="mt-8 text-[13px]" style={{ color: '#d00' }}>
            {error?.message ?? dict.result.no_result}
          </p>

          <Link
            href="/kyk/step1?restart=1"
            className="mt-8 inline-block rounded-md px-4 py-2 text-[14px] font-medium"
            style={{ background: BTN, color: 'white' }}
          >
            {dict.result.btn_retake}
          </Link>
        </div>
      </main>
    )
  }

  const computed = (data.computed ?? {}) as unknown as Computed
  const profile = computed.profile ?? {}
  
  // 1. Load admin-configured keywords override from DB
  let adminKeywords: string[] = []
  if (computed.primary_type) {
    const { data: kwData } = await supabase
      .from('kyk_admin_keywords' as any)
      .select('keywords')
      .eq('mbti_type', computed.primary_type.toLowerCase())
      .maybeSingle() as any
      
    if (kwData?.keywords && Array.isArray(kwData.keywords)) {
      adminKeywords = kwData.keywords.filter(Boolean)
    }
  }

  // 2. Fallback to dictionary keys if DB rows are not populated yet
  const keywords = adminKeywords.length > 0
    ? adminKeywords.slice(0, 3) 
    : (Array.isArray(profile.keywords) ? profile.keywords.slice(0, 3) : [])

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">{dict.result.title}</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          {dict.result.subtitle}
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-10">
          <div className="rounded-lg border p-6" style={{ borderColor: BORDER }}>
            <div className="text-[14px] font-medium" style={{ color: MUTED }}>
              {profile.animal ? dict.computed[profile.animal as keyof typeof dict.computed] : 'Result'}
            </div>

            <div className="mt-2 text-[22px] font-medium leading-tight">
              {profile.title ? dict.computed[profile.title as keyof typeof dict.computed] : dict.result.unable_to_display}
            </div>

            {profile.summary && (
              <p className="mt-4 text-[14px] leading-relaxed" style={{ color: TEXT }}>
                {dict.computed[profile.summary as keyof typeof dict.computed] ?? profile.summary}
              </p>
            )}

            {keywords.length > 0 && (
              <div className="mt-6">
                <div className="text-[13px] font-medium" style={{ color: MUTED }}>
                  {dict.result.keyword_title}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {keywords.map((k) => {
                    const label = dict.computed[k as keyof typeof dict.computed] ?? k
                    return (
                      <Link
                        key={k}
                        href={`/coach?prefill=${encodeURIComponent(label)}`}
                        className="rounded-full border px-3 py-1 text-[13px]"
                        style={{ borderColor: BORDER }}
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/coach"
                className="inline-block rounded-md px-4 py-2 text-[14px] font-medium"
                style={{ background: BTN, color: 'white' }}
              >
                {dict.result.btn_coach}
              </Link>

              <Link
                href="/kyk/step1?restart=1"
                className="inline-block rounded-md border px-4 py-2 text-[14px] font-medium"
                style={{ borderColor: BORDER, color: TEXT }}
              >
                {dict.result.btn_retry}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}