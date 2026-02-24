// src/app/api/giveaway/enter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Missing Supabase env (URL / SERVICE_ROLE_KEY)')

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isValidEmail(v: string) {
  // 너무 빡세게 하지 말고 기본만
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))

    const teamId = String(body?.teamId ?? '').trim()
    const emailRaw = String(body?.email ?? '').trim().toLowerCase()

    if (!teamId || !emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT', message: 'Invalid teamId or email.' },
        { status: 400 }
      )
    }

    const sb = admin()

    // ✅ insert
    const { error } = await sb.from('giveaway_entries').insert({
      team_id: teamId,
      email: emailRaw,
    } as any)

    // ✅ 중복 응모: 유니크 제약(23505) 전제
    if (error && (error as any).code === '23505') {
      return NextResponse.json({
        ok: false,
        code: 'ALREADY_ENTERED',
        message: 'You have already entered this giveaway.',
      })
    }

    if (error) {
      return NextResponse.json(
        { ok: false, code: 'DB_ERROR', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}