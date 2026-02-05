import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type OkRes = {
  ok: true
  today: string
  claimed_today: boolean
  streak: number
  board: boolean[]
}

type ErrRes = { ok: false; reason: string; error?: string }

function utcDateString(d = new Date()) {
  // YYYY-MM-DD (UTC)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr) {
      const out: ErrRes = { ok: false, reason: 'auth_error', error: authErr.message }
      return NextResponse.json(out, { status: 200 })
    }

    if (!user) {
      const out: ErrRes = { ok: false, reason: 'not_authenticated' }
      return NextResponse.json(out, { status: 200 })
    }

    // ✅ UTC 기준 today
    const today = utcDateString()

    // ✅ reward_claims에서 내 것만 (RLS 정책 있어야 함)
    const { data, error } = await supabase
      .from('reward_claims')
      .select('claim_date')
      .eq('user_id', user.id)
      .order('claim_date', { ascending: false })
      .limit(60)

    if (error) {
      const out: ErrRes = { ok: false, reason: 'db_error', error: error.message }
      return NextResponse.json(out, { status: 200 })
    }

    const dates = (data ?? [])
      .map((r: any) => String(r.claim_date ?? '').slice(0, 10))
      .filter(Boolean)

    const set = new Set(dates)

    const claimedToday = set.has(today)

    // ✅ 연속 streak 계산 (UTC 기준)
    // 연속이면: today, today-1, today-2... 끊길 때까지
    let consecutive = 0
    {
      const base = new Date(today + 'T00:00:00Z')
      for (let i = 0; i < 365; i++) {
        const d = new Date(base)
        d.setUTCDate(base.getUTCDate() - i)
        const key = utcDateString(d)
        if (set.has(key)) consecutive++
        else break
      }
    }

    // ✅ “14일 사이클”이니까 보드는 streak를 1~14로 순환
    // 예: 15연속이면 (15-1)%14+1 = 1
    const streak = consecutive > 0 ? ((consecutive - 1) % 14) + 1 : 0

    // ✅ 도장판: 1~streak 만큼 true
    const board = Array.from({ length: 14 }, (_, i) => i < streak)

    const out: OkRes = {
      ok: true,
      today,
      claimed_today: claimedToday,
      streak,
      board,
    }
    return NextResponse.json(out, { status: 200 })
  } catch (e: any) {
    // ✅ 절대 500 던지지 말고 이유를 내려줌
    const out: ErrRes = { ok: false, reason: 'server_error', error: String(e?.message ?? e) }
    return NextResponse.json(out, { status: 200 })
  }
}
