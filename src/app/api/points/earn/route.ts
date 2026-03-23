import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'

const DAILY_LIMITS: Record<string, number> = {
  'AI 코치 대화': 30,
  '출석 체크': 15,
}

const ONE_TIME_REASONS = ['KYK 완료']

const MAX_FREE_POINTS = 3000

async function createSupabase() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => { try { cookieStore.set({ name, value, ...options }) } catch {} },
      remove: (name, options) => { try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }) } catch {} },
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { amount, reason } = await req.json()
    if (!amount || !reason || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 })
    }

    const supabase = await createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })

    // 현재 포인트 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .maybeSingle()

    const currentPoints = Number((profile as any)?.points ?? 0)

    // 무료 한도 초과 체크
    if (currentPoints >= MAX_FREE_POINTS) {
      return NextResponse.json({ ok: false, error: 'limit_reached', currentPoints }, { status: 200 })
    }

    // 1회 한정 체크
    if (ONE_TIME_REASONS.includes(reason)) {
      const { count } = await (supabase as any)
        .from('points_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reason', reason)
      if ((count ?? 0) > 0) {
        return NextResponse.json({ ok: false, error: 'already_earned', currentPoints }, { status: 200 })
      }
    }

    // 일일 한도 체크
    const dailyLimit = DAILY_LIMITS[reason]
    let pointsAdded = amount
    if (dailyLimit !== undefined) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: todayRows } = await (supabase as any)
        .from('points_history')
        .select('amount')
        .eq('user_id', user.id)
        .eq('reason', reason)
        .gte('created_at', todayStart.toISOString())
      const earnedToday = (todayRows ?? []).reduce((s: number, r: any) => s + r.amount, 0)
      const remaining = dailyLimit - earnedToday
      if (remaining <= 0) {
        return NextResponse.json({ ok: false, error: 'daily_limit_reached', currentPoints }, { status: 200 })
      }
      pointsAdded = Math.min(amount, remaining)
    }

    // 3000P 한도 초과 방지
    pointsAdded = Math.min(pointsAdded, MAX_FREE_POINTS - currentPoints)

    // DB 저장
    const { error: histErr } = await (supabase as any)
      .from('points_history')
      .insert({ user_id: user.id, type: 'earn', amount: pointsAdded, reason })

    if (histErr) return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })

    // profiles.points 업데이트
    const newTotal = currentPoints + pointsAdded
    await supabase.from('profiles').upsert({ id: user.id, points: newTotal })

    return NextResponse.json({ ok: true, pointsAdded, newTotal })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
  }
}
