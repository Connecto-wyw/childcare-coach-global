export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

// ---------- Supabase Admin (Service Role) ----------
function admin(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ---------- helpers ----------
function asObject(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value !== 'object') return {}
  if (Array.isArray(value)) return {}
  return value as Record<string, any>
}

export async function POST() {
  // ✅ Next 16에서도 route handler에서 cookies()는 async로 쓰는 게 안전
  const cookieStore = await cookies()

  const draftId = cookieStore.get('kyk_draft')?.value
  if (!draftId) {
    return NextResponse.json({ ok: false, error: 'no draft' }, { status: 400 })
  }

  // ✅ 여기 핵심: auth-helpers가 Promise를 기대함
  const supabaseAuth = createRouteHandlerClient<Database>({
    cookies: async () => cookieStore,
  })

  const { data: authData, error: authErr } = await supabaseAuth.auth.getUser()
  if (authErr) {
    return NextResponse.json({ ok: false, error: authErr.message }, { status: 401 })
  }

  const user = authData?.user
  if (!user) {
    return NextResponse.json({ ok: false, error: 'not logged in' }, { status: 401 })
  }

  const supabase = admin()

  // 1) draft 로드
  const { data: draft, error: dErr } = await supabase
    .from('kyk_drafts')
    .select('draft_id, answers, computed')
    .eq('draft_id', draftId)
    .single()

  if (dErr || !draft) {
    return NextResponse.json(
      { ok: false, error: dErr?.message ?? 'draft missing' },
      { status: 404 }
    )
  }

  // 2) computed 안전 캐스팅
  const computed = asObject(draft.computed)

  const color = (computed.color ?? 'BLUE') as Database['public']['Tables']['kyk_results']['Insert']['color']
  const primaryType = String(computed.primary_type ?? 'INTP')
  const profile = asObject(computed.profile)

  // 3) 결과 저장
  const { data: inserted, error: iErr } = await supabase
    .from('kyk_results')
    .insert({
      user_id: user.id,
      answers: draft.answers, // answers도 Json 타입이라 그대로 OK
      color,
      primary_type: primaryType,
      profile,
    })
    .select('id')
    .single()

  if (iErr || !inserted) {
    return NextResponse.json(
      { ok: false, error: iErr?.message ?? 'insert failed' },
      { status: 500 }
    )
  }

  // 4) draft 삭제
  await supabase.from('kyk_drafts').delete().eq('draft_id', draftId)

  // 5) 쿠키 제거
  cookieStore.set('kyk_draft', '', { path: '/', maxAge: 0 })

  return NextResponse.json({ ok: true, result_id: inserted.id })
}