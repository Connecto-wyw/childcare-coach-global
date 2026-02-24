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

function isValidEmail(v: string) {
  const s = (v ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const teamId = String(body.teamId ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()

    if (!teamId || !isValidEmail(email)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const sb = admin()

    // ✅ teamId로 활성 이벤트 찾기
    const { data: ev, error: evErr } = await (sb as any)
      .from('giveaway_events')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 })
    }

    const eventId = String(ev?.id ?? '').trim()
    if (!eventId) {
      return NextResponse.json({ error: 'no_active_event' }, { status: 400 })
    }

    const { error: insErr } = await (sb as any).from('giveaway_entries').insert({
      event_id: eventId,
      team_id: teamId,
      email,
    })

    // ✅ 중복 응모 (unique 걸려있으면)
    if (insErr && (insErr as any).code === '23505') {
      return NextResponse.json({ alreadyEntered: true })
    }

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}