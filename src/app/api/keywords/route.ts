// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

function getAdminUuidAllowlist(): Set<string> {
  const raw = process.env.ADMIN_UUIDS || ''
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return new Set(list)
}

function isAdmin(req: NextRequest): boolean {
  const allow = getAdminUuidAllowlist()
  if (allow.size === 0) return false
  const uuid = (req.headers.get('x-admin-uuid') || '').trim()
  if (!uuid) return false
  return allow.has(uuid)
}

type Row = { id: string; keyword: string; order: number }
type PostBody = { keyword?: string; order?: number }
type PutBody = { id?: string; keyword?: string; order?: number }

export async function GET(req: NextRequest) {
  const { client, error } = getServiceClient()
  if (!client) return jsonError(500, error ?? 'missing_env')

  const admin = isAdmin(req)

  if (admin) {
    const { data, error: dbError } = await client
      .from(TABLE)
      .select('id, keyword, "order"')
      .order('order', { ascending: true })

    if (dbError) return jsonError(500, 'db_error', dbError.message)

    const rows: Row[] = (data ?? []).map((r: any, idx: number) => ({
      id: String(r.id),
      keyword: String(r.keyword),
      order: Number.isFinite(Number(r.order)) ? Number(r.order) : idx,
    }))

    return NextResponse.json({ ok: true, data: rows })
  }

  // public: top 4 only (id 없이)
  const { data, error: dbError } = await client
    .from(TABLE)
    .select('keyword, "order"')
    .order('order', { ascending: true })
    .limit(4)

  if (dbError) return jsonError(500, 'db_error', dbError.message)

  const keywords = (data ?? []).map((r: any) => String(r.keyword)).filter(Boolean)
  return NextResponse.json({ ok: true, keywords, data: [] })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return jsonError(401, 'unauthorized')

  const { client, error } = getServiceClient()
  if (!client) return jsonError(500, error ?? 'missing_env')

  const body = (await req.json().catch(() => ({}))) as PostBody
  const keyword = (body.keyword ?? '').trim()
  const order = Number(body.order)

  if (!keyword || Number.isNaN(order)) return jsonError(400, 'bad_request')

  const { error: dbError } = await client.from(TABLE).insert([{ keyword, order }])
  if (dbError) return jsonError(500, 'db_error', dbError.message)

  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return jsonError(401, 'unauthorized')

  const { client, error } = getServiceClient()
  if (!client) return jsonError(500, error ?? 'missing_env')

  const body = (await req.json().catch(() => ({}))) as PutBody
  const id = (body.id ?? '').trim()
  const keyword = body.keyword !== undefined ? String(body.keyword).trim() : undefined
  const order = body.order !== undefined ? Number(body.order) : undefined

  if (!id) return jsonError(400, 'bad_request', 'missing id')
  if (keyword !== undefined && !keyword) return jsonError(400, 'bad_request', 'empty keyword')
  if (order !== undefined && Number.isNaN(order)) return jsonError(400, 'bad_request', 'invalid order')

  const patch: any = {}
  if (keyword !== undefined) patch.keyword = keyword
  if (order !== undefined) patch.order = order

  if (Object.keys(patch).length === 0) return jsonError(400, 'bad_request', 'nothing to update')

  const { error: dbError } = await client.from(TABLE).update(patch).eq('id', id)
  if (dbError) return jsonError(500, 'db_error', dbError.message)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return jsonError(401, 'unauthorized')

  const { client, error } = getServiceClient()
  if (!client) return jsonError(500, error ?? 'missing_env')

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return jsonError(400, 'bad_request', 'missing id')

  const { error: dbError } = await client.from(TABLE).delete().eq('id', id)
  if (dbError) return jsonError(500, 'db_error', dbError.message)

  return NextResponse.json({ ok: true })
}
