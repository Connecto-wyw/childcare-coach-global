import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function ymdInKST(d = new Date()) {
  // ✅ 서버가 UTC여도, "KST 기준 yyyy-mm-dd" 문자열로 고정
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(d) // "YYYY-MM-DD"
}

function addDays(ymd: string, delta: number) {
  // ymd는 KST 기준 문자열이지만, 계산은 안전하게 UTC 기준 Date로 처리
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
  }

  // ✅ 오늘을 KST 기준으로 고정
  const today = ymdInKST(new Date())

  // reward_claims에서 최근 기록 조회 (day는 KST date로 저장됨)
  const { data, error } = await supabase
    .from('reward_claims')
    .select('day')
    .eq('user_id', user.id)
    .order('day', { ascending: false })
    .limit(40)

  if (error) {
    return NextResponse.json({ ok: false, reason: 'db_error', error: String(error.message ?? error) }, { status: 500 })
  }

  const days = (data ?? [])
    .map((r: any) => String(r.day))
    .filter(Boolean)

  if (days.length === 0) {
    return NextResponse.json({
      ok: true,
      today,
      claimed_today: false,
      streak: 0,
      board: Array.from({ length: 14 }, () => false),
    })
  }

  // ✅ lastClaim 기준으로 "아직 오늘 안 했어도" streak 유지
  const last = days[0] // 가장 최근 day

  // last가 오늘보다 2일 이상 과거면(하루라도 빠짐) streak=0
  const yesterday = addDays(today, -1)
  const isLastToday = last === today
  const isLastYesterday = last === yesterday

  if (!isLastToday && !isLastYesterday) {
    return NextResponse.json({
      ok: true,
      today,
      claimed_today: false,
      streak: 0,
      board: Array.from({ length: 14 }, () => false),
    })
  }

  // ✅ 연속 streak 계산: last부터 역으로 consecutive days 존재하는지 체크
  const set = new Set(days)
  let streakTotal = 0
  let cursor = last
  while (set.has(cursor)) {
    streakTotal += 1
    cursor = addDays(cursor, -1)
    if (streakTotal > 365) break
  }

  // ✅ 14일 보드/싸이클 포지션
  const cyclePos = ((streakTotal - 1) % 14) + 1 // 1~14
  const board = Array.from({ length: 14 }, (_, i) => i < cyclePos)

  return NextResponse.json({
    ok: true,
    today,
    claimed_today: isLastToday,
    streak: cyclePos, // UI에서 "Day n" 느낌으로 보이게
    board,
  })
}
