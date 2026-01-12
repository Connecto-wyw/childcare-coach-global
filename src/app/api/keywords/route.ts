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
  return { error: null, client: createClient(url, key, { auth: { persistSession: false } }) }
}

type Body = { keyword?: string; order?: number }

export async function GET() {
  // ✅ 공개 조회: 상단 4개만 내려줌 (RLS 영향 없게 service_role로 읽음)
  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  const { data, error: dbError } = await client
    .from('popular_keywords')
    .select('keyword, "order"')
    .order('order', { ascending: true })
    .limit(4)

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 400 })
  }

  const keywords = (data ?? []).map((r: any) => String(r.keyword)).filter(Boolean)
  return NextResponse.json({ keywords })
}

export async function POST(req: NextRequest) {
  // ✅ 관리자만 추가 가능(세션 이메일 도메인 체크)
  const sb = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const email = user.email.toLowerCase()
  if (!email.endsWith('@connecto-wyw.com')) {
    return NextResponse.json({ error: 'invalid_domain' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Body
  const keyword = (body.keyword ?? '').trim()
  const order = Number(body.order)

  if (!keyword || Number.isNaN(order)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  const { error: dbError } = await client
    .from('popular_keywords')
    .insert([{ keyword, order, user_id: user.id }])

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  // ✅ 관리자만 삭제 가능(세션 이메일 도메인 체크)
  const sb = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const email = user.email.toLowerCase()
  if (!email.endsWith('@connecto-wyw.com')) {
    return NextResponse.json({ error: 'invalid_domain' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  const { error: dbError } = await client.from('popular_keywords').delete().eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
