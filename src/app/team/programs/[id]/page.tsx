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
  if (!url || !anon) throw new Error('Missing env')
  const cookieStore = await cookies()
  return createServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => { try { cookieStore.set({ name, value, ...options }) } catch {} },
      remove: (name, options) => { try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }) } catch {} },
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

const HABIT_TYPE_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', custom: 'Custom',
}
const AUTH_METHOD_LABEL: Record<string, string> = {
  photo: '사진 인증', text: '텍스트 인증', both: '사진+텍스트',
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 flex flex-col gap-1 ${accent ? 'bg-[#fff8f0] border border-[#fde8c8]' : 'bg-[#f5f9ff] border border-[#ddeeff]'}`}>
      <span className="text-[11px] text-[#8a8a8a] font-medium">{label}</span>
      <span className={`text-[18px] font-bold leading-tight ${accent ? 'text-[#c0392b]' : 'text-[#0e0e0e]'}`}>{value}</span>
    </div>
  )
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: program } = await (supabase as any)
    .from('market_programs')
    .select('*')
    .eq('id', id)
    .single()

  if (!program || !(program as Program).is_active) notFound()

  const prog = program as Program

  const dateRange = prog.start_date && prog.end_date
    ? `${prog.start_date} ~ ${prog.end_date}`
    : prog.start_date ? `${prog.start_date} ~` : null

  return (
    <main className="bg-white min-h-screen pb-[100px]">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* 뒤로가기 */}
        <Link
          href="/team"
          className="inline-flex items-center gap-1 text-[14px] text-[#8a8a8a] hover:text-[#0e0e0e] transition-colors mb-5"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          MARKET
        </Link>

        {/* 썸네일 */}
        {prog.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prog.thumbnail_url}
            alt={prog.title}
            className="w-full rounded-2xl object-cover aspect-video mb-5"
          />
        ) : null}

        {/* 제목 + 배지 */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-2 mb-2">
            {prog.habit_type ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#eaf6ff] text-[#2F8EEA]">
                {HABIT_TYPE_LABEL[prog.habit_type] ?? prog.habit_type}
              </span>
            ) : null}
            {prog.period_days ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#0e0e0e] text-white">
                {prog.period_days}일 챌린지
              </span>
            ) : null}
            {dateRange ? (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f5f5f5] text-[#6b6b6b]">
                {dateRange}
              </span>
            ) : null}
          </div>
          <h1 className="text-[22px] font-bold text-[#0e0e0e] leading-snug">{prog.title}</h1>
        </div>

        {/* 핵심 스탯 그리드 */}
        {(prog.deposit || prog.basic_reward || prog.bonus_reward || prog.discount_rate) ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {prog.deposit ? (
              <StatBox label="예치금" value={`${prog.deposit.toLocaleString()}원`} accent />
            ) : null}
            {prog.basic_reward ? (
              <StatBox label="기본 보상" value={`${prog.basic_reward.toLocaleString()}원/회`} />
            ) : null}
            {prog.bonus_reward ? (
              <StatBox label="보너스 보상" value={`${prog.bonus_reward.toLocaleString()}원`} />
            ) : null}
            {prog.discount_rate ? (
              <StatBox label="할인율" value={`${prog.discount_rate}%`} />
            ) : null}
          </div>
        ) : null}

        {/* 인증 정보 */}
        {(prog.auth_method || prog.auth_count || prog.weekly_max_count) ? (
          <div className="rounded-xl border border-[#e9e9e9] p-4 mb-6">
            <h2 className="text-[13px] font-bold text-[#0e0e0e] mb-3">인증 방식</h2>
            <div className="flex flex-wrap gap-4 text-[13px] text-[#4a4a4a]">
              {prog.auth_method ? (
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#3497f3]" fill="currentColor">
                    <path d="M8 2a2 2 0 100 4A2 2 0 008 2zM3 10c0-2.21 2.239-4 5-4s5 1.79 5 4v1H3v-1z"/>
                  </svg>
                  {AUTH_METHOD_LABEL[prog.auth_method] ?? prog.auth_method}
                </div>
              ) : null}
              {prog.weekly_max_count ? (
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#3497f3]" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="12" height="12" rx="1.5"/>
                    <path d="M5 1v3M11 1v3M2 6h12"/>
                  </svg>
                  주 {prog.weekly_max_count}회
                </div>
              ) : null}
              {prog.auth_count ? (
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#3497f3]" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  총 {prog.auth_count}회 인증
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 가이드 HTML */}
        {prog.guide_html ? (
          <div className="mb-6">
            <h2 className="text-[14px] font-bold text-[#0e0e0e] mb-3">프로그램 가이드</h2>
            <div
              className="prose prose-sm max-w-none text-[#3a3a3a] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: prog.guide_html }}
            />
          </div>
        ) : null}
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed bottom-[var(--bottom-nav-h,0px)] left-0 right-0 bg-white border-t border-[#eeeeee] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            className="w-full py-3.5 rounded-xl bg-[#9F1D23] text-white text-[15px] font-bold hover:bg-[#7e161b] transition-colors"
          >
            참여하기
          </button>
        </div>
      </div>
    </main>
  )
}
