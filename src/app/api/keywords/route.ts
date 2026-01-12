// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getServiceClient(): { error: 'missing_env' | null; client: SupabaseClient | null } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { error: 'missing_env', client: null }
  return {
    error: null,
    client: createClient(url, key, { auth: { persistSession: false } }),
  }
}

// 공통: 관리자 세션/도메인 체크
async function requireAdmin() {
  const sb = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user?.email) {
    return { ok: false as const, status: 401 as const, error: 'unauthorized' as const, user: null }
  }

  const email = user.email.toLowerCase()
  if (!email.endsWith('@connecto-wyw.com')) {
    return { ok: false as const, status: 403 as const, error: 'invalid_domain' as const, user: null }
  }

  return { ok: true as const, status: 200 as const, error: null, user }
}

type Body = { keyword?: string; order?: number }

type KeywordRow = {
  id: string
  keyword: string
  order: number | null
  user_id?: string | null
}

// ✅ 홈/공개 조회용: 서비스 롤로 읽어서 RLS 영향 제거
export async function GET() {
  const { error, client } = getServiceClient()
  if (error || !client) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 })
  }

  const { data, error: dbError } = await client
    .from('popular_keywords')
    .select('id, keyword, "order"')
    .order('order', { ascending: true })
    .limit(4)

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as KeywordRow[]
  const keywords = rows.map((r) => String(r.keyword))

  return NextResponse.json({ keywords, data: rows }, { status: 200 })
}

export async function POST(req: NextRequest) {
  // 1) 세션 사용자 확인 (관리자만)
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const user = admin.user

  // 2) 입력 파싱
  const body = (await req.json().catch(() => ({}))) as Body
  const keyword = (body.keyword ?? '').trim()
  const order = Number(body.order)

  if (!keyword || Number.isNaN(order)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // 3) 서비스 클라이언트로 DB 삽입
  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  const { error: dbError } = await client
    .from('popular_keywords')
    .insert([{ keyword, order, user_id: user.id }])

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

// ✅ (권장) 관리자 삭제도 API로 통일 (RLS/권한 이슈 방지)
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  // id는 querystring으로 받자: /api/keywords?id=...
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'bad_request', detail: 'missing id' }, { status: 400 })
  }

  const { error: dbError } = await client.from('popular_keywords').delete().eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
