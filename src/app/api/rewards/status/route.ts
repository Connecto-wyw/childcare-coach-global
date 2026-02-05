import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEPLOY_MARK = 'status-v4-next-cookies-async'

function getEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

async function getSupabaseRouteClient() {
  const cookieStore = await cookies() // ✅ 핵심: await

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })
}

function utcDateString(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const supabase = await getSupabaseRouteClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr) {
      return NextResponse.json(
        { ok: false, reason: 'auth_error', error: userErr.message, deploy: DEPLOY_MARK },
        { status: 200 }
      )
    }

    if (!user) {
      return NextResponse.json({ ok: false, reason: 'not_authenticated', deploy: DEPLOY_MARK }, { status: 200 })
    }

    const today = utcDateString()

    const { data, error } = await supabase
      .from('reward_claims')
      .select('claim_date')
      .eq('user_id', user.id)
      .order('claim_date', { ascending: false })
      .limit(60)

    if (error) {
      return NextResponse.json(
        { ok: false, reason: 'db_error', error: error.message, deploy: DEPLOY_MARK },
        { status: 200 }
      )
    }

    const dates = (data ?? [])
      .map((r: any) => String(r.claim_date ?? '').slice(0, 10))
      .filter(Boolean)

    const set = new Set(dates)
    const claimed_today = set.has(today)

    // ✅ 오늘 기준 연속 일수 계산
    let consecutive = 0
    const base = new Date(today + 'T00:00:00Z')
    for (let i = 0; i < 365; i++) {
      const d = new Date(base)
      d.setUTCDate(base.getUTCDate() - i)
      const key = utcDateString(d)
      if (set.has(key)) consecutive++
      else break
    }

    // ✅ 14일 보드: streak(1~14), board[0..13] true/false
    const streak = consecutive > 0 ? ((consecutive - 1) % 14) + 1 : 0
    const board = Array.from({ length: 14 }, (_, i) => i < streak)

    return NextResponse.json(
      { ok: true, today, claimed_today, streak, board, deploy: DEPLOY_MARK },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: 'server_error', error: String(e?.message ?? e), deploy: DEPLOY_MARK },
      { status: 200 }
    )
  }
}
