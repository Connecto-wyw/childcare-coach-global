// src/app/api/rewards/status/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = ymdInKST(new Date())

  // ✅ 로그인 안해도 200 + 기본값
  if (!user) {
    return NextResponse.json({
      ok: true,
      today,
      claimed_today: false,
      streak: 0,
      board: Array.from({ length: 14 }, () => false),
      reason: 'not_authenticated',
    })
  }

  const { data, error } = await supabase
    .from('reward_claims')
    .select('day')
    .eq('user_id', user.id)
    .order('day', { ascending: false })
    .limit(40)

  // ✅ 여기서도 500 금지: 200 + ok:false 로 내려서 프론트가 "http_error" 찍지 않게
  if (error) {
    return NextResponse.json({
      ok: false,
      reason: 'db_error',
      today,
      claimed_today: false,
      streak: 0,
      board: Array.from({ length: 14 }, () => false),
      error: String(error.message ?? error),
    })
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

  const last = days[0]
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

  const set = new Set(days)
  let streakTotal = 0
  let cursor = last
  while (set.has(cursor)) {
    streakTotal += 1
    cursor = addDays(cursor, -1)
    if (streakTotal > 365) break
  }

  const cyclePos = ((streakTotal - 1) % 14) + 1
  const board = Array.from({ length: 14 }, (_, i) => i < cyclePos)

  return NextResponse.json({
    ok: true,
    today,
    claimed_today: isLastToday,
    streak: cyclePos,
    board,
  })
}
