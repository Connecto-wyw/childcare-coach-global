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

type SaveBody = {
  // Q1~Q13 응답 전체(또는 중간 상태)
  // 예: { q1_adjectives: string[], likert: { q2:1..4, ... }, meta: {...} }
  answers: Record<string, any>

  // (선택) 미리 계산된 값들
  // 예: { color:'BLUE', primary_type:'INTP', profile:{...} }
  computed?: Record<string, any>
}

export async function POST(req: Request) {
  // ✅ Next 15: cookies()는 await 필요
  const cookieStore = await cookies()
  const draftId = cookieStore.get('kyk_draft')?.value
  if (!draftId) {
    return NextResponse.json({ ok: false, error: 'no draft' }, { status: 400 })
  }

  let body: SaveBody | null = null
  try {
    body = (await req.json()) as SaveBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  if (!body?.answers || typeof body.answers !== 'object') {
    return NextResponse.json({ ok: false, error: 'no answers' }, { status: 400 })
  }

  const supabase = admin()

  // expires_at 연장(24h)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('kyk_drafts')
    .update({
      answers: body.answers,
      computed: body.computed ?? {},
      expires_at: expiresAt,
    })
    .eq('draft_id', draftId)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}