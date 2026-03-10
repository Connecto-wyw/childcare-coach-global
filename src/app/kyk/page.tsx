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
          Know Your Kid · Understand your child’s personality and parenting context
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        {!hasResult ? (
          <section className="mt-10">
            <div
              className="rounded-2xl border px-6 py-7"
              style={{ borderColor: BORDER, background: '#fff' }}
            >
              <div className="text-[22px] font-medium leading-tight">
                A simple way to better understand your child’s personality
              </div>

              <p className="mt-4 text-[14px] leading-relaxed" style={{ color: TEXT }}>
                KYK helps you explore your child’s temperament and response patterns
                through a short set of questions. Once your result is saved, the AI Coach
                can provide more relevant and personalized guidance based on your child’s
                unique personality.
              </p>

              <div className="mt-6 space-y-3 text-[14px] leading-relaxed" style={{ color: MUTED }}>
                <p>• It only takes about 1–2 minutes to complete.</p>
                <p>• You can begin without logging in, but sign-in may be required to save your result.</p>
                <p>• You can retake KYK anytime as your child grows and changes.</p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/kyk/step1"
                  className="inline-block rounded-md px-4 py-2 text-[14px] font-medium"
                  style={{ background: INDIANBOB_RED, color: 'white' }}
                >
                  Start KYK Now
                </Link>

                <Link
                  href="/coach"
                  className="inline-block rounded-md border px-4 py-2 text-[14px] font-medium"
                  style={{ borderColor: BORDER, color: TEXT }}
                >
                  Go to AI Coach
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
              <div className="text-[13px] font-medium tracking-wide" style={{ color: INDIANBOB_RED }}>
                YOUR LATEST KYK RESULT
              </div>

              <div className="mt-3 text-[24px] font-medium leading-tight">
                {profile.title ?? 'Your child’s personality result'}
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
                  style={{ background: INDIANBOB_RED, color: 'white' }}
                >
                  View Result
                </Link>

                <Link
                  href="/kyk/step1?restart=1"
                  className="inline-block rounded-md border px-4 py-2 text-[14px] font-medium"
                  style={{ borderColor: BORDER, color: TEXT }}
                >
                  Retake KYK
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}