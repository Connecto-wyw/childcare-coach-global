// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status })
}

function getServiceClient(): { error: 'missing_env' | null; client: SupabaseClient | null } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { error: 'missing_env', client: null }
  return { error: null, client: createClient(url, key, { auth: { persistSession: false } }) }
}

/**
 * ✅ 핵심: cookies()를 await 하지 말고,
 * createRouteHandlerClient에는 cookies 함수로 그대로 넘기기
 */
async function requireAdmin() {
  const sb = createRouteHandlerClient<Database>({
    cookies: () => cookies(),
  })

  const { data, error } = await sb.auth.getUser()
  if (error) return { ok: false as const, status: 401 as const, error: 'unauthorized' as const, detail: error.message }

  const user = data.user
  if (!user?.email) {
    return { ok: false as const, status: 401 as const, error: 'unauthorized' as const, detail: 'no user/email' }
  }

  const email = user.email.toLowerCase()
  if (!email.endsWith('@connecto-wyw.com')) {
    return { ok: false as const, status: 403 as const, error: 'invalid_domain' as const, detail: email }
  }

  return { ok: true as const, user }
}

type Body = { keyword?: string; order?: number }

export async function GET() {
  try {
    const { error, client } = getServiceClient()
    if (error || !client) {
      return jsonError(500, 'missing_env', 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing')
    }

    const { data, error: dbError } = await client
      .from('popular_keywords')
      .select('id, keyword, "order"')
      .order('order', { ascending: true })
      .limit(4)

    if (dbError) return jsonError(500, 'db_error', dbError.message)

    const keywords = (data ?? []).map((r: any) => String(r.keyword))
    return NextResponse.json({ keywords, data }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonError(500, 'unhandled_exception', msg)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) return jsonError(admin.status, admin.error, admin.detail)

    const body = (await req.json().catch(() => ({}))) as Body
    const keyword = (body.keyword ?? '').trim()
    const order = Number(body.order)
    if (!keyword || Number.isNaN(order)) return jsonError(400, 'bad_request', 'keyword/order required')

    const { error, client } = getServiceClient()
    if (error || !client) {
      return jsonError(500, 'missing_env', 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing')
    }

    const { error: dbError } = await client.from('popular_keywords').insert([{ keyword, order }])
    if (dbError) return jsonError(400, 'db_error', dbError.message)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonError(500, 'unhandled_exception', msg)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) return jsonError(admin.status, admin.error, admin.detail)

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return jsonError(400, 'bad_request', 'missing id')

    const { error, client } = getServiceClient()
    if (error || !client) {
      return jsonError(500, 'missing_env', 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing')
    }

    const { error: dbError } = await client.from('popular_keywords').delete().eq('id', id)
    if (dbError) return jsonError(400, 'db_error', dbError.message)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonError(500, 'unhandled_exception', msg)
  }
}
