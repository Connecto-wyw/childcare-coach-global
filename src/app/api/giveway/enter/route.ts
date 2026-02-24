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
    auth: { persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const teamId = String(body.teamId ?? '')
    const email = String(body.email ?? '').trim().toLowerCase()

    if (!teamId || !email) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const sb = admin()

    const { error } = await sb.from('giveaway_entries').insert({
      team_id: teamId,
      email,
    } as any)

    // ✅ 중복 응모
    if (error && (error as any).code === '23505') {
      return NextResponse.json({
        alreadyEntered: true,
      })
    }

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}