// src/app/kyk/result/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { getDictionary } from '@/i18n'
import NewResultPage from './NewResultPage'

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
  adjective_color?: string
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
  const rawKeywords = adminKeywords.length > 0
    ? adminKeywords.slice(0, 4)
    : (Array.isArray(profile.keywords) ? profile.keywords.slice(0, 4) : [])

  // dict 키라면 번역값으로, 아니면 원본 그대로 사용
  const resolvedKeywords = rawKeywords.map(
    (k) => dict.computed[k as keyof typeof dict.computed] ?? k
  )

  return (
    <NewResultPage
      primaryType={computed.primary_type}
      adjectiveColor={computed.adjective_color}
      animal={profile.animal ? dict.computed[profile.animal as keyof typeof dict.computed] : undefined}
      title={profile.title ? dict.computed[profile.title as keyof typeof dict.computed] : undefined}
      summary={profile.summary ? (dict.computed[profile.summary as keyof typeof dict.computed] ?? profile.summary) : undefined}
      keywords={resolvedKeywords}
      dict={dict.result}
    />
  )
}