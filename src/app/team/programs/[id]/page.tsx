// src/app/team/programs/[id]/page.tsx (Server Component)
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const cookieStore = await cookies()

  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        } catch {}
      },
    },
  })
}

type Program = {
  id: string
  title: string
  thumbnail_url: string | null
  habit_type: string | null
  auth_method: string | null
  period_days: number | null
  auth_count: number | null
  weekly_max_count: number | null
  start_date: string | null
  end_date: string | null
  deposit: number | null
  basic_reward: number | null
  discount_rate: number | null
  bonus_reward: number | null
  guide_html: string | null
  is_active: boolean
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: program } = await (supabase as any)
    .from('market_programs')
    .select('*')
    .eq('id', id)
    .single()

  if (!program || !(program as Program).is_active) {
    notFound()
  }

  const prog = program as Program

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/team"
          className="inline-block mb-6 text-[14px] text-[#3497f3] hover:underline"
        >
          ← Back
        </Link>

        {prog.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prog.thumbnail_url}
            alt={prog.title}
            className="w-full rounded-xl object-cover aspect-video mb-6"
          />
        ) : null}

        <h1 className="text-[24px] font-bold text-[#0e0e0e] mb-6">{prog.title}</h1>

        <div className="divide-y divide-[#e9e9e9]">
          {prog.habit_type ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Type</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium capitalize">{prog.habit_type}</span>
            </div>
          ) : null}
          {prog.auth_method ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Auth Method</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium capitalize">{prog.auth_method}</span>
            </div>
          ) : null}
          {prog.period_days ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Period</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.period_days} days</span>
            </div>
          ) : null}
          {prog.auth_count ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Auth Count</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.auth_count}</span>
            </div>
          ) : null}
          {prog.weekly_max_count ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Weekly Max</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.weekly_max_count}</span>
            </div>
          ) : null}
          {prog.start_date ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Start Date</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.start_date}</span>
            </div>
          ) : null}
          {prog.end_date ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">End Date</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.end_date}</span>
            </div>
          ) : null}
          {prog.deposit ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Deposit</span>
              <span className="text-[14px] text-[#3497f3] font-semibold">{prog.deposit.toLocaleString()}</span>
            </div>
          ) : null}
          {prog.basic_reward ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Basic Reward</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.basic_reward.toLocaleString()}</span>
            </div>
          ) : null}
          {prog.bonus_reward ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Bonus Reward</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.bonus_reward.toLocaleString()}</span>
            </div>
          ) : null}
        </div>

        {prog.guide_html ? (
          <div 
            className="mt-8 prose prose-sm max-w-none text-[#3a3a3a]"
            dangerouslySetInnerHTML={{ __html: prog.guide_html }}
          />
        ) : null}
      </div>
    </main>
  )
}
