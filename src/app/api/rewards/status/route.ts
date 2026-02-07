// src/app/api/rewards/status/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
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

export async function GET() {
  const today = ymdInKST(new Date())

  try {
    const supabase = await createSupabaseServer()
    const { data } = await supabase.auth.getUser()
    const user = data.user

    // ✅ 미로그인이어도 "HTTP 200 + JSON"으로 내려서 UI가 http_error 찍지 않게
    if (!user) {
      return NextResponse.json({
        ok: false,
        reason: 'not_authenticated',
        today,
        claimed_today: false,
        streak: 0,
        board: Array.from({ length: 14 }, () => false),
      })
    }

    const { data: rows, error } = await supabase
      .from('reward_claims')
      .select('day')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(60)

    if (error) {
      // ✅ 여기도 500으로 던지지 말고 200으로 내려서 UI 표시 안정화
      return NextResponse.json({
        ok: false,
        reason: 'db_error',
        today,
        error: String(error.message ?? error),
        claimed_today: false,
        streak: 0,
        board: Array.from({ length: 14 }, () => false),
      })
    }

    const days = (rows ?? []).map((r: any) => String(r.day)).filter(Boolean)

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

    // 하루라도 끊기면 초기화
    if (!isLastToday && !isLastYesterday) {
      return NextResponse.json({
        ok: true,
        today,
        claimed_today: false,
        streak: 0,
        board: Array.from({ length: 14 }, () => false),
      })
    }

    // 연속 streak 계산
    const set = new Set(days)
    let streakTotal = 0
    let cursor = last
    while (set.has(cursor)) {
      streakTotal += 1
      cursor = addDays(cursor, -1)
      if (streakTotal > 365) break
    }

    const cyclePos = ((streakTotal - 1) % 14) + 1 // 1~14
    const board = Array.from({ length: 14 }, (_, i) => i < cyclePos)

    return NextResponse.json({
      ok: true,
      today,
      claimed_today: isLastToday,
      streak: cyclePos,
      board,
    })
  } catch (e: any) {
    // ✅ 서버에서 터져도 200 + reason으로 내려서 화면에 http_error가 아니라 원인 텍스트가 찍히게
    return NextResponse.json({
      ok: false,
      reason: 'server_error',
      today,
      error: String(e?.message ?? e),
      claimed_today: false,
      streak: 0,
      board: Array.from({ length: 14 }, () => false),
    })
  }
}
