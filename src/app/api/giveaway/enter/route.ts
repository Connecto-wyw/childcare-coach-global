// src/app/api/giveaway/enter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// (선택) 405/프리플라이트 방지
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const teamId = String(body.teamId ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()

    if (!teamId || !email) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const sb = admin()

    // ✅ 1) teamId에 연결된 "활성 이벤트" 찾기
    const { data: ev, error: evErr } = await sb
      .from('giveaway_events')
      .select('id, ends_at, is_active')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .maybeSingle()

    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 })
    }
    if (!ev?.id) {
      // 활성 이벤트가 없으면 응모 불가
      return NextResponse.json({ error: 'event_not_found' }, { status: 404 })
    }

    const eventId = ev.id

    // ✅ 2) 응모 저장 (event_id 필수)
    const { error: insErr } = await sb
      .from('giveaway_entries')
      .insert({ event_id: eventId, email } as any)

    // ✅ 3) 중복 응모 (유니크 제약 조건 필요)
    if (insErr && (insErr as any).code === '23505') {
      return NextResponse.json({ alreadyEntered: true }, { status: 200 })
    }

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}