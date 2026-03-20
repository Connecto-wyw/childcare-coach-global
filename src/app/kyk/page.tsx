// src/app/kyk/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { getDictionary } from '@/i18n'
import NewResultPage from './result/NewResultPage'
import PageHeader from '@/components/layout/PageHeader'


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
        // read-only page
      },
    },
  })
}

export default async function KYKHomePage() {
  const supabase = await getServerSupabase()
  const dict = await getDictionary('kyk')
  const t = dict.landing

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

  // 결과가 있으면 NewResultPage를 바로 렌더링
  if (hasResult) {
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

    const rawKeywords = adminKeywords.length > 0
      ? adminKeywords.slice(0, 4)
      : (Array.isArray(profile.keywords) ? profile.keywords.slice(0, 4) : [])

    const resolvedKeywords = rawKeywords.map(
      (k) => dict.computed[k as keyof typeof dict.computed] ?? k
    )

    return (
      <NewResultPage
        primaryType={computed.primary_type}
        animal={profile.animal ? dict.computed[profile.animal as keyof typeof dict.computed] : undefined}
        title={profile.title ? dict.computed[profile.title as keyof typeof dict.computed] : undefined}
        summary={profile.summary ? (dict.computed[profile.summary as keyof typeof dict.computed] ?? profile.summary) : undefined}
        keywords={resolvedKeywords}
      />
    )
  }

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <style>{`
        @keyframes customFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-custom-float { animation: customFloat 4s ease-in-out infinite; }
      `}</style>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader title="KYK" subtitle={t.subtitle} />

        <div className="mt-8 flex flex-col md:flex-row md:items-center md:gap-12">
          {/* 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 모바일: 이미지를 콘텐츠 위에 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing-mockup.png"
              alt=""
              className="md:hidden w-full max-w-[320px] mx-auto mb-8 object-contain drop-shadow-lg animate-custom-float"
            />

            <h2 className="text-[18px] font-bold text-[#0e0e0e] mb-2">{t.intro_title}</h2>
            <p className="text-[14px] leading-relaxed text-[#6b6b6b] mb-6 break-keep">
              {t.intro_desc}
            </p>

            <div className="space-y-3 text-[14px] leading-relaxed text-[#4a4a4a] bg-[#f5f9ff] rounded-xl p-5 mb-8 border border-[#e0eeff]">
              <p className="flex items-start gap-2">
                <span className="text-[#3497f3] mt-0.5">✦</span>
                <span className="break-keep">{t.point_1.replace('• ', '')}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#3497f3] mt-0.5">✦</span>
                <span className="break-keep">{t.point_2.replace('• ', '')}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#3497f3] mt-0.5">✦</span>
                <span className="break-keep">{t.point_3.replace('• ', '')}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-sm">
              <Link
                href="/kyk/step1"
                className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-[15px] font-bold text-white bg-[#9F1D23] hover:bg-[#7e161b] transition-colors"
              >
                {t.btn_start}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <Link
                href="/coach"
                className="w-full rounded-xl border border-[#e9e9e9] py-3.5 text-[14px] font-semibold text-center text-[#6b6b6b] hover:bg-[#f5f5f5] transition-colors"
              >
                {t.btn_coach}
              </Link>
            </div>
          </div>

          {/* 데스크탑: 이미지를 오른쪽에 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing-mockup.png"
            alt=""
            className="hidden md:block w-[260px] shrink-0 object-contain drop-shadow-xl animate-custom-float"
          />
        </div>
      </div>
    </main>
  )
}