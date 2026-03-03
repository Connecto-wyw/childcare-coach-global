export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function admin(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST() {
  const supabase = admin()

  // draft 생성
  const { data, error } = await supabase
    .from('kyk_drafts')
    .insert({
      answers: {},
      computed: {},
      // expires_at는 테이블 default가 있으니 생략 가능
    })
    .select('draft_id')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'start failed' },
      { status: 500 }
    )
  }

  // ✅ Next 15: cookies()는 await 필요
  const cookieStore = await cookies()

  // httpOnly 쿠키에 draft_id 저장
  cookieStore.set('kyk_draft', data.draft_id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  })

  return NextResponse.json({ ok: true, draft_id: data.draft_id })
}