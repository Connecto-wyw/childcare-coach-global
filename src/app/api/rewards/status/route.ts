// src/app/api/rewards/status/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ✅ Intl(timeZone) 없이 KST yyyy-mm-dd 생성 (서버 환경 이슈 방지)
function ymdInKST(d = new Date()) {
  // KST = UTC+9
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000
  const kst = new Date(utc + 9 * 60 * 60_000)

  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const day = String(kst.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    const { data: u, error: uErr } = await supabase.auth.getUser()
    const user = u?.user ?? null

    const today = ymdInKST(new Date())

    // ✅ 로그인 안 해도 UI가 깨지지 않게 200 + 기본값
    if (uErr || !user) {
      return NextResponse.json({
        ok: false,
        reason: 'not_authenticated',
        today,
        claimed_today: false,
        streak: 0,
        board: Array.from({ length: 14 }, () => false),
      })
    }

    const { data, error } = await supabase
      .from('reward_claims')
      .select('day')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(120)

    // ✅ DB 에러도 200으로 내려서 http_error/server_error 문구가 계속 뜨는 걸 막고,
    // debug로 원인 노출
    if (error) {
      return NextResponse.json({
        ok: false,
        reason: 'db_error',
        today,
        claimed_today: false,
        streak: 0,
        board: Array.from({ length: 14 }, () => false),
        debug: {
          code: (error as any).code ?? null,
          message: error.message ?? String(error),
          details: (error as any).details ?? null,
          hint: (error as any).hint ?? null,
        },
      })
    }

    const days = (data ?? [])
      .map((r: any) => String(r.day ?? '').trim())
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
  } catch (e: any) {
    // ✅ 어떤 예외든 UI 깨지지 않게 JSON으로
    return NextResponse.json({
      ok: false,
      reason: 'server_error',
      today: ymdInKST(new Date()),
      claimed_today: false,
      streak: 0,
      board: Array.from({ length: 14 }, () => false),
      debug: { message: String(e?.message ?? e) },
    })
  }
}
