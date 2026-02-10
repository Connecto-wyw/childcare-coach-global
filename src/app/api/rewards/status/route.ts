// src/app/api/rewards/status/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function ymdInUTC(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function addDaysUTC(ymd: string, delta: number) {
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
  const today = ymdInUTC(new Date())

  let supabase: Awaited<ReturnType<typeof createSupabaseServer>>
  try {
    supabase = await createSupabaseServer()
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      reason: 'config_error',
      today,
      claimed_today: false,
      streak: 0,
      board: Array.from({ length: 14 }, () => false),
      error: String(e?.message ?? e),
    })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      ok: true,
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
    .limit(40)

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

  const days = (data ?? []).map((r: any) => String(r.day)).filter(Boolean)

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
  const yesterday = addDaysUTC(today, -1)
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
    cursor = addDaysUTC(cursor, -1)
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
