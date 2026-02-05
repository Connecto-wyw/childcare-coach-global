import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function toUtcDateString(d = new Date()) {
  // YYYY-MM-DD (UTC)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
  }

  const today = toUtcDateString(new Date())

  // 최근 30개 정도만 가져와서 streak 계산 (충분)
  const { data: claims, error } = await supabase
    .from('reward_claims')
    .select('claim_date, points')
    .eq('user_id', user.id)
    .order('claim_date', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ ok: false, reason: 'server_error', error: error.message }, { status: 500 })
  }

  const set = new Set((claims ?? []).map((r: any) => String(r.claim_date)))
  const claimed_today = set.has(today)

  // streak: 오늘부터(클레임 했으면 오늘, 아니면 어제부터) 연속 claim_date 계산
  const base = new Date(today + 'T00:00:00Z')
  if (!claimed_today) base.setUTCDate(base.getUTCDate() - 1)

  let streak = 0
  const cursor = new Date(base)
  for (let i = 0; i < 365; i++) {
    const ds = toUtcDateString(cursor)
    if (!set.has(ds)) break
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  // 14-day board: 현재 streak 기준으로 Day1~Day14 중 찍힌 개수(최대14)
  const boardCount = Math.min(streak + (claimed_today ? 1 : 0), 14) // today 포함 시각화용
  const board = Array.from({ length: 14 }, (_, i) => i < boardCount)

  return NextResponse.json({
    ok: true,
    today,
    claimed_today,
    streak,
    board,
  })
}
