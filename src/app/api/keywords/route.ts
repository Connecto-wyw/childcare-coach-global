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

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status })
}

function getServiceClient(): { client: SupabaseClient | null; error?: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) return { client: null, error: 'missing_env_url' }
  if (!key) return { client: null, error: 'missing_env_service_role' }
  return { client: createClient(url, key, { auth: { persistSession: false } }) }
}

function getAnonClient(): { client: SupabaseClient | null; error?: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) return { client: null, error: 'missing_env_url' }
  if (!anon) return { client: null, error: 'missing_env_anon_key' }
  return { client: createClient(url, anon, { auth: { persistSession: false } }) }
}

async function getAdminFromAuthHeader(req: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]?.trim()
  if (!token) return { isAdmin: false }

  const { client: anonClient } = getAnonClient()
  if (!anonClient) return { isAdmin: false }

  const { data, error } = await anonClient.auth.getUser(token)
  if (error) return { isAdmin: false }

  const email = (data.user?.email ?? '').toLowerCase()
  const isAdmin = !!email && email.endsWith(ADMIN_DOMAIN)
  return { isAdmin, userId: data.user?.id }
}

async function getAdminFromCookieSafe(): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const sb = createRouteHandlerClient<Database>({ cookies })
    const { data, error } = await sb.auth.getUser()
    if (error) return { isAdmin: false }
    const email = (data.user?.email ?? '').toLowerCase()
    const isAdmin = !!email && email.endsWith(ADMIN_DOMAIN)
    return { isAdmin, userId: data.user?.id }
  } catch {
    return { isAdmin: false }
  }
}

async function getAdmin(req: NextRequest) {
  // 1) Authorization 헤더 우선 (가장 확실)
  const byHeader = await getAdminFromAuthHeader(req)
  if (byHeader.isAdmin) return byHeader
  // 2) 쿠키 fallback
  return await getAdminFromCookieSafe()
}

type Body = { keyword?: string; order?: number }

export async function GET(req: NextRequest) {
  try {
    const { client, error } = getServiceClient()
    if (!client) return jsonError(500, error ?? 'missing_env')

    const admin = await getAdmin(req)

    if (admin.isAdmin) {
      const { data, error: dbError } = await client
        .from(TABLE)
        .select('id, keyword, "order"')
        .order('order', { ascending: true })

      if (dbError) return jsonError(500, 'db_error', dbError.message)

      const rows = (data ?? []).map((r: any, idx: number) => ({
        id: String(r.id),
        keyword: String(r.keyword),
        order: Number.isFinite(Number(r.order)) ? Number(r.order) : idx,
      }))

      return NextResponse.json({
        ok: true,
        keywords: rows.map((r) => r.keyword).filter(Boolean),
        data: rows,
      })
    }

    // public: top 4
    const { data, error: dbError } = await client
      .from(TABLE)
      .select('keyword, "order"')
      .order('order', { ascending: true })
      .limit(4)

    if (dbError) return jsonError(500, 'db_error', dbError.message)

    const keywords = (data ?? []).map((r: any) => String(r.keyword)).filter(Boolean)
    return NextResponse.json({ ok: true, keywords, data: [] })
  } catch (e: any) {
    return jsonError(500, 'unhandled_error', e?.message ?? 'unknown')
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdmin(req)
    if (!admin.isAdmin) return jsonError(401, 'unauthorized')

    const body = (await req.json().catch(() => ({}))) as Body
    const keyword = (body.keyword ?? '').trim()
    const order = Number(body.order)

    if (!keyword || Number.isNaN(order)) return jsonError(400, 'bad_request')

    const { client, error } = getServiceClient()
    if (!client) return jsonError(500, error ?? 'missing_env')

    const payload: any = { keyword, order }
    // user_id 컬럼 없으면 넣지 마 (있어도 문제 없음)
    if (admin.userId) payload.user_id = admin.userId

    const { error: dbError } = await client.from(TABLE).insert([payload])
    if (dbError) return jsonError(500, 'db_error', dbError.message)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonError(500, 'unhandled_error', e?.message ?? 'unknown')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdmin(req)
    if (!admin.isAdmin) return jsonError(401, 'unauthorized')

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return jsonError(400, 'bad_request')

    const { client, error } = getServiceClient()
    if (!client) return jsonError(500, error ?? 'missing_env')

    const { error: dbError } = await client.from(TABLE).delete().eq('id', id)
    if (dbError) return jsonError(500, 'db_error', dbError.message)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonError(500, 'unhandled_error', e?.message ?? 'unknown')
  }
}
