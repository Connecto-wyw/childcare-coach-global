// src/app/api/rewards/claim/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database, Tables } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const REWARDS = [
  100, 100, 100, 100, 100, 100, // 1-6
  300, // 7
  100, 100, 100, 100, 100, 100, // 8-13
  600, // 14
]

// ✅ UTC 기준 날짜(YYYY-MM-DD)
function ymdInUTC(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function addDaysUTC(ymd: string, delta: number) {
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

function mustEnv(name: string) {
  const v = (process.env[name] || '').trim()
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

async function createSupabaseServer() {
  const url = mustEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = mustEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

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

// ✅ "오늘(UTC)" 질문 1개 이상 했는지 체크 (DB에서 바로)
async function hasQuestionTodayUTC(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  userId: string,
  todayUtc: string
) {
  const { count, error } = await supabase
    .from('chat_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${todayUtc}T00:00:00.000Z`)
    .not('question', 'is', null)

  if (error) return false
  return (count ?? 0) > 0
}

export async function POST() {
  const supabase = await createSupabaseServer()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
  }

  // ✅ 오늘/어제 모두 UTC
  const today = ymdInUTC(new Date())
  const yesterday = addDaysUTC(today, -1)

  // 1) 오늘 질문 했는지
  const okQuestion = await hasQuestionTodayUTC(supabase, user.id, today)
  if (!okQuestion) {
    return NextResponse.json({ ok: false, reason: 'no_question_today', today }, { status: 200 })
  }

  // 2) profiles에서 데이터 가져오기
  type ProfilePick = Pick<Tables<'profiles'>, 'points' | 'reward_last_date' | 'reward_streak'>

  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('points, reward_last_date, reward_streak')
    .eq('id', user.id)
    .maybeSingle()

  if (profErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(profErr.message ?? profErr) },
      { status: 200 }
    )
  }

  const p = (prof as ProfilePick | null) ?? null
  const currentPoints = Number(p?.points ?? 0)
  const lastDate = (p?.reward_last_date ?? null) as string | null // ✅ 문자열(YYYY-MM-DD)라고 가정
  const lastStreak = Number(p?.reward_streak ?? 0)

  // 3) 이미 오늘 받았으면 종료
  if (lastDate === today) {
    return NextResponse.json({ ok: false, reason: 'already_claimed', today }, { status: 200 })
  }

  // 4) reward_claims 중복 방지(오늘 record 있으면 종료)
  const { data: claimedRow, error: chkErr } = await supabase
    .from('reward_claims')
    .select('id')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle()

  if (chkErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(chkErr.message ?? chkErr) },
      { status: 200 }
    )
  }

  if (claimedRow) {
    return NextResponse.json({ ok: false, reason: 'already_claimed', today }, { status: 200 })
  }

  // 5) 연속 streak 계산 (UTC 기준)
  const nextTotalStreak = lastDate === yesterday ? Math.max(1, lastStreak + 1) : 1

  // 6) 14일 사이클 포지션(1~14)
  const cyclePos = ((nextTotalStreak - 1) % 14) + 1
  const rewardPoints = REWARDS[cyclePos - 1] ?? 100

  // 7) reward_claims insert (UTC day를 명시적으로 저장)
  const { error: insErr } = await supabase.from('reward_claims').insert({
    user_id: user.id,
    day: today,
    points: rewardPoints, // 테이블에 있으면 저장, 없으면 지워도 됨
  } as any)

  if (insErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(insErr.message ?? insErr) },
      { status: 200 }
    )
  }

  // 8) profiles 업데이트
  const nextPoints = currentPoints + rewardPoints

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      points: nextPoints,
      reward_last_date: today,
      reward_streak: nextTotalStreak,
    })
    .eq('id', user.id)

  if (updErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(updErr.message ?? updErr) },
      { status: 200 }
    )
  }

  // 9) UI 갱신용 board
  const board = Array.from({ length: 14 }, (_, i) => i < cyclePos)

  return NextResponse.json({
    ok: true,
    today,
    points_added: rewardPoints,
    streak: cyclePos,
    board,
    total_points: nextPoints,
  })
}
