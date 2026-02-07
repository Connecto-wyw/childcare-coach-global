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
  return fmt.format(d) // "YYYY-MM-DD"
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

function emptyPayload(today: string) {
  return {
    ok: false as const,
    reason: 'not_authenticated' as const,
    today,
    claimed_today: false,
    streak: 0,
    board: Array.from({ length: 14 }, () => false),
  }
}

export async function GET() {
  const today = ymdInKST(new Date())

  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    const { data, error: userErr } = await supabase.auth.getUser()
    const user = data?.user ?? null

    // ✅ 401 금지: 로그인 관련은 무조건 200으로 내려서 UI가 처리
    if (userErr || !user) {
      return NextResponse.json(emptyPayload(today), { status: 200 })
    }

    const { data: rows, error } = await supabase
      .from('reward_claims')
      .select('day')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(40)

    if (error) {
      // ✅ 진짜 DB 에러는 500 유지 (이건 프론트에서 메시지 그대로 노출 가능)
      return NextResponse.json(
        { ok: false, reason: 'db_error', error: String(error.message ?? error) },
        { status: 500 }
      )
    }

    const days = (rows ?? [])
      .map((r: any) => String(r?.day ?? '').trim())
      .filter(Boolean)

    if (days.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          today,
          claimed_today: false,
          streak: 0,
          board: Array.from({ length: 14 }, () => false),
        },
        { status: 200 }
      )
    }

    const last = days[0]
    const yesterday = addDays(today, -1)
    const isLastToday = last === today
    const isLastYesterday = last === yesterday

    if (!isLastToday && !isLastYesterday) {
      return NextResponse.json(
        {
          ok: true,
          today,
          claimed_today: false,
          streak: 0,
          board: Array.from({ length: 14 }, () => false),
        },
        { status: 200 }
      )
    }

    // ✅ 연속 streak 계산
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

    return NextResponse.json(
      {
        ok: true,
        today,
        claimed_today: isLastToday,
        streak: cyclePos,
        board,
      },
      { status: 200 }
    )
  } catch (e: any) {
    // ✅ 여기서 터지면 프론트는 무조건 http_error 뜸 → 메시지라도 내려주자
    return NextResponse.json(
      { ok: false, reason: 'server_error', error: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
