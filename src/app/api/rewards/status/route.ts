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

    if (authErr) return NextResponse.json({ ok: false, reason: 'auth_error', error: authErr.message } satisfies ErrRes, { status: 200 })
    if (!user) return NextResponse.json({ ok: false, reason: 'not_authenticated' } satisfies ErrRes, { status: 200 })

    const today = utcDateString()
    const { data, error } = await supabase
      .from('reward_claims')
      .select('claim_date')
      .eq('user_id', user.id)
      .order('claim_date', { ascending: false })
      .limit(60)

    if (error) return NextResponse.json({ ok: false, reason: 'db_error', error: error.message } satisfies ErrRes, { status: 200 })

    const dates = (data ?? [])
      .map((r: any) => String(r.claim_date ?? '').slice(0, 10))
      .filter(Boolean)

    const set = new Set(dates)
    const claimed_today = set.has(today)

    // consecutive days from today backward
    let consecutive = 0
    const base = new Date(today + 'T00:00:00Z')
    for (let i = 0; i < 365; i++) {
      const d = new Date(base)
      d.setUTCDate(base.getUTCDate() - i)
      const key = utcDateString(d)
      if (set.has(key)) consecutive++
      else break
    }

    const streak = consecutive > 0 ? ((consecutive - 1) % 14) + 1 : 0
    const board = Array.from({ length: 14 }, (_, i) => i < streak)

    const out: OkRes = { ok: true, today, claimed_today, streak, board }
    return NextResponse.json(out, { status: 200 })
  } catch (e: any) {
    const out: ErrRes = { ok: false, reason: 'server_error', error: String(e?.message ?? e) }
    return NextResponse.json(out, { status: 200 })
  }
}
