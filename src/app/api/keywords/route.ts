// src/app/api/keywords/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TABLE = 'popular_keywords' as const
// columns: id (uuid), keyword (text), order (int)

import { requireAdminAuth } from '@/lib/auth/isAdmin'

function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status })
}

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * ✅ PUBLIC READ
 * - Coach 페이지에서 인기 키워드를 보여주려면 GET은 공개로 두는 게 맞음.
 * - 대신 write(POST/PUT/DELETE)는 관리자만 허용.
 */
  export async function GET() {
    try {
      const admin = adminDb()
      const { data, error } = await admin
        .from(TABLE)
        .select('id, keyword, order, keyword_i18n')
        .order('order', { ascending: true })

    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminAuth()
  if (!auth.ok) return jsonErr(auth.status, auth.error, auth.detail)

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const keyword = String(body?.keyword ?? '').trim()
  const keyword_i18n = body?.keyword_i18n ?? null
  const order = Number(body?.order)

  if (!keyword) return jsonErr(400, 'bad_request', 'keyword is required')
  if (Number.isNaN(order)) return jsonErr(400, 'bad_request', 'order must be a number')

  try {
    const admin = adminDb()
    const { error } = await admin.from(TABLE).insert([{ keyword, keyword_i18n, order } as any])
    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}

// PATCH: update item details or re-order
export async function PUT(req: Request) {
  const auth = await requireAdminAuth()
  if (!auth.ok) return jsonErr(auth.status, auth.error, auth.detail)

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const id = String(body?.id ?? '').trim()
  const keyword = String(body?.keyword ?? '').trim()
  const keyword_i18n = body?.keyword_i18n ?? null
  const order = Number(body?.order)

  if (!id) return jsonErr(400, 'bad_request', 'id is required')
  if (!keyword) return jsonErr(400, 'bad_request', 'keyword is required')
  if (Number.isNaN(order)) return jsonErr(400, 'bad_request', 'order must be a number')

  try {
    const admin = adminDb()
    const { error } = await admin.from(TABLE).update({ keyword, keyword_i18n, order } as any).eq('id', id)
    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdminAuth()
  if (!auth.ok) return jsonErr(auth.status, auth.error, auth.detail)

  const url = new URL(req.url)
  const id = (url.searchParams.get('id') ?? '').trim()
  if (!id) return jsonErr(400, 'bad_request', 'id is required')

  try {
    const admin = adminDb()
    const { error } = await admin.from(TABLE).delete().eq('id', id)
    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}
