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

function ymdInKST(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(d) // YYYY-MM-DD
}

function addDays(ymd: string, delta: number) {
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

/**
 * ✅ KST "하루"의 UTC 범위 계산
 * - KST 00:00:00  ~ 다음날 00:00:00
 * - UTC로는 9시간 빼면 됨
 */
function kstDayToUtcRange(todayKst: string) {
  const [y, m, d] = todayKst.split('-').map(Number)

  // KST 기준 자정(00:00)을 "UTC로 표현"하려면 9시간을 더한 UTC시각이 KST자정이 됨
  // 즉, UTC = KST - 9h  => KST 자정은 UTC 전날 15:00
  const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 9 * 60 * 60 * 1000)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)

  return { startIso: startUtc.toISOString(), endIso: endUtc.toISOString() }
}

// ✅ "오늘(KST)" 질문 1개 이상 했는지 (created_at 범위로 DB에서 직접 체크)
async function hasQuestionToday(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  userId: string,
  todayKst: string
) {
  const { startIso, endIso } = kstDayToUtcRange(todayKst)

  const { count, error } = await supabase
    .from('chat_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('question', 'is', null)
    .gte('created_at', startIso)
    .lt('created_at', endIso)

  return { ok: !error, has: (count ?? 0) > 0, error }
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

  const today = ymdInKST(new Date())
  const yesterday = addDays(today, -1)

  // 1) 오늘 질문 했는지
  const q = await hasQuestionToday(supabase, user.id, today)
  if (!q.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'chat_logs_read_error',
        today,
        error: String(q.error?.message ?? q.error),
      },
      { status: 200 }
    )
  }
  if (!q.has) {
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
  const lastDate = (p?.reward_last_date ?? null) as string | null
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

  // 5) 연속 streak 계산
  const nextTotalStreak = lastDate === yesterday ? Math.max(1, lastStreak + 1) : 1

  // 6) 14일 사이클 포지션(1~14)
  const cyclePos = ((nextTotalStreak - 1) % 14) + 1
  const rewardPoints = REWARDS[cyclePos - 1] ?? 100

  // 7) reward_claims insert
  const { error: insErr } = await supabase.from('reward_claims').insert({
    user_id: user.id,
    day: today, // ✅ 여기서 명시적으로 today 넣어버리자 (DB default에 의존하지 않기)
    points: rewardPoints, // ✅ 컬럼 없으면 지워
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

  // 9) UI 즉시 갱신용 board
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
