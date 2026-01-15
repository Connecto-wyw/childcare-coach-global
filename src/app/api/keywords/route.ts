// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ADMIN_DOMAIN = '@connecto-wyw.com'
const TABLE = 'popular_keywords'

function getServiceClient(): { error: 'missing_env' | null; client: SupabaseClient | null } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { error: 'missing_env', client: null }
  return { error: null, client: createClient(url, key, { auth: { persistSession: false } }) }
}

type Body = { keyword?: string; order?: number }

async function isAdminSession(): Promise<{ isAdmin: boolean; userId?: string; email?: string }> {
  const sb = createRouteHandlerClient<Database>({ cookies })
  const { data } = await sb.auth.getUser()
  const email = data.user?.email?.toLowerCase() ?? ''
  const isAdmin = !!email && email.endsWith(ADMIN_DOMAIN)
  return { isAdmin, userId: data.user?.id, email: data.user?.email ?? undefined }
}

export async function GET() {
  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  // ✅ 관리자면: id 포함 전체 목록 반환 (어드민 페이지가 기대하는 형태)
  const { isAdmin } = await isAdminSession()

  if (isAdmin) {
    const { data, error: dbError } = await client
      .from(TABLE)
      .select('id, keyword, "order"')
      .order('order', { ascending: true })

    if (dbError) {
      return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 500 })
    }

    const rows = (data ?? []).map((r: any) => ({
      id: String(r.id),
      keyword: String(r.keyword),
      order: typeof r.order === 'number' ? r.order : Number(r.order ?? 0),
    }))

    // 호환성: keywords도 같이 내려줌
    const keywords = rows.map((r) => r.keyword).filter(Boolean)

    return NextResponse.json({ keywords, data: rows })
  }

  // ✅ 일반 공개: 상단 4개만 (기존 동작 유지)
  const { data, error: dbError } = await client
    .from(TABLE)
    .select('keyword, "order"')
    .order('order', { ascending: true })
    .limit(4)

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 500 })
  }

  const keywords = (data ?? []).map((r: any) => String(r.keyword)).filter(Boolean)
  return NextResponse.json({ keywords, data: [] })
}

export async function POST(req: NextRequest) {
  // ✅ 관리자만 추가 가능 (세션 이메일 도메인 체크)
  const { isAdmin, userId } = await isAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Body
  const keyword = (body.keyword ?? '').trim()
  const order = Number(body.order)

  if (!keyword || Number.isNaN(order)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  // ⚠️ user_id 컬럼이 테이블에 없으면 여기서 db_error 남
  const { error: dbError } = await client
    .from(TABLE)
    .insert([{ keyword, order, user_id: userId } as any])

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  // ✅ 관리자만 삭제 가능
  const { isAdmin } = await isAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const { error, client } = getServiceClient()
  if (error || !client) return NextResponse.json({ error: 'missing_env' }, { status: 500 })

  const { error: dbError } = await client.from(TABLE).delete().eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: 'db_error', detail: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
