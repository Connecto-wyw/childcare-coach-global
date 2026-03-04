// src/app/api/kyk/start/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { randomUUID } from 'crypto'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const DRAFT_COOKIE = 'kyk_draft'

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const draftId = randomUUID()

    // 1) draft row 생성 (서비스 롤로)
    const supabaseAdmin = admin()
    const { error } = await supabaseAdmin.from('kyk_drafts').insert({
      id: draftId,
      answers: {}, // 처음은 빈 answers
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // 2) 쿠키 세팅
    const res = NextResponse.json({ ok: true, draft_id: draftId }, { status: 200 })

    res.cookies.set(DRAFT_COOKIE, draftId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
    })

    return res
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}