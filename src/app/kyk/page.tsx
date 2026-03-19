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

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const INDIANBOB_RED = '#9F1D23'

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
    <main className="min-h-screen bg-[#Dce3Ef] relative selection:bg-blue-200">
      <style>{`
        @keyframes customFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-custom-float {
          animation: customFloat 4s ease-in-out infinite;
        }
      `}</style>

      {/* Hero Section with Image */}
      <div className="w-full flex justify-center pt-16 pb-20 px-4 relative overflow-hidden">
        <div className="relative w-full max-w-[340px] flex items-center justify-center animate-custom-float">
            <img 
               src="/images/landing-mockup.png" 
               alt="KYK Marketing Image" 
               className="object-contain w-full h-auto drop-shadow-2xl"
               style={{ filter: "drop-shadow(0px 20px 30px rgba(0, 0, 0, 0.15))" }}
            />
        </div>
      </div>

      {/* Main Content Area - overlapping the hero slightly */}
      <div className="bg-white rounded-t-[36px] pt-12 pb-24 px-6 -mt-12 relative z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.06)] min-h-[50vh]">
        <div className="mx-auto max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-[30px] font-extrabold leading-tight text-gray-900 tracking-tight">
               {t.title}
            </h1>
            <p className="text-[16px] font-medium text-gray-500 mt-2 max-w-[280px] mx-auto leading-relaxed">
               {t.subtitle}
            </p>
          </div>
          
          <div
            className="rounded-[28px] border border-gray-100 bg-white px-7 py-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <h2 className="text-[22px] font-bold leading-snug text-gray-800 text-center mb-4 tracking-tight">
              {t.intro_title}
            </h2>

            <p className="text-[15px] leading-[1.6] text-gray-600 text-center mb-8 break-keep">
              {t.intro_desc}
            </p>

            <div className="space-y-4 text-[14px] leading-relaxed text-gray-700 bg-blue-50/50 rounded-2xl p-6 mb-10 border border-blue-50">
              <p className="flex items-start gap-2.5">
                <span className="text-blue-500 mt-0.5 text-[16px]">✨</span> 
                <span className="break-keep">{t.point_1.replace('• ', '')}</span>
              </p>
              <p className="flex items-start gap-2.5">
                <span className="text-blue-500 mt-0.5 text-[16px]">✨</span> 
                <span className="break-keep">{t.point_2.replace('• ', '')}</span>
              </p>
              <p className="flex items-start gap-2.5">
                <span className="text-blue-500 mt-0.5 text-[16px]">✨</span> 
                <span className="break-keep">{t.point_3.replace('• ', '')}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3.5 mt-2">
              <Link
                href="/kyk/step1"
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 text-[17px] font-bold text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_20px_rgba(159,29,35,0.2)]"
                style={{ background: INDIANBOB_RED, color: 'white' }}
              >
                {t.btn_start}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </Link>

              <Link
                href="/coach"
                className="w-full rounded-2xl border-2 border-gray-100 bg-white py-4 text-[16px] font-bold text-center text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                {t.btn_coach}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}