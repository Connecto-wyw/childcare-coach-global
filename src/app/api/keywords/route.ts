// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ADMIN_DOMAIN = '@connecto-wyw.com'

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status })
}

// ✅ service role client: 없으면 바로 throw (실수로 anon으로 치는 사고 방지)
function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('MISSING_NEXT_PUBLIC_SUPABASE_URL')
  if (!key) throw new Error('MISSING_SUPABASE_SERVICE_ROLE_KEY')

  return createClient(url, key, { auth: { persistSession: false } })
}

// ✅ 세션 기반으로 "관리자"인지 확인 (DB 쓰기는 여기서 안 함)
async function requireAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { ok: false as const, status: 500 as const, error: 'missing_env', detail: 'missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY' }
  }

  const cookieStore = await cookies()

  const sb = createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })

  const { data, error } = await sb.auth.getUser()
  if (error) return { ok: false as const, status: 401 as const, error: 'unauthorized', detail: error.message }

  const user = data.user
  if (!user?.email) return { ok: false as const, status: 401 as const, error: 'unauthorized', detail: 'no user/email' }

  const email = user.email.toLowerCase()
  if (!email.endsWith(ADMIN_DOMAIN)) {
    return { ok: false as const, status: 403 as const, error: 'invalid_domain', detail: email }
  }

  return { ok: true as const, user }
}

type Body = { keyword?: string; order?: number }

// ✅ public read: 홈/어드민 공통으로 사용 가능
export async function GET() {
  try {
    const client = getServiceClient()

    const { data, error } = await client
      .from('popular_keywords')
      .select('id, keyword, "order"')
      .order('order', { ascending: true })
      .limit(20)

    if (error) return jsonError(500, 'db_error', error.message)

    return NextResponse.json({ data: data ?? [] }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonError(500, 'unhandled_exception', msg)
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1) 관리자 인증
    const admin = await requireAdmin()
    if (!admin.ok) return jsonError(admin.status, admin.error, admin.detail)

    // 2) 입력
    const body = (await req.json().catch(() => ({}))) as Body
    const keyword = (body.keyword ?? '').trim()
    const order = Number(body.order)
    if (!keyword || Number.isNaN(order)) return jsonError(400, 'bad_request', 'keyword/order required')

    // 3) service role로 insert (RLS 영향 없음)
    const client = getServiceClient()
    const { error } = await client.from('popular_keywords').insert([{ keyword, order }])

    if (error) return jsonError(400, 'db_error', error.message)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonError(500, 'unhandled_exception', msg)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 1) 관리자 인증
    const admin = await requireAdmin()
    if (!admin.ok) return jsonError(admin.status, admin.error, admin.detail)

    // 2) id 파싱
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return jsonError(400, 'bad_request', 'missing id')

    // 3) service role로 delete (RLS 영향 없음)
    const client = getServiceClient()
    const { error } = await client.from('popular_keywords').delete().eq('id', id)

    if (error) return jsonError(400, 'db_error', error.message)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonError(500, 'unhandled_exception', msg)
  }
}
