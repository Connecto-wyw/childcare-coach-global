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

function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status })
}

function parseAllowEmails() {
  const raw = process.env.ADMIN_EMAILS || ''
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list
}

async function requireAdminEmail() {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data, error } = await supabase.auth.getUser()
  if (error) return { ok: false as const, status: 401, error: 'not_authenticated', detail: error.message }
  const user = data?.user
  if (!user) return { ok: false as const, status: 401, error: 'not_authenticated', detail: 'No user session.' }

  const allow = parseAllowEmails()
  if (allow.length === 0) {
    return {
      ok: false as const,
      status: 403,
      error: 'admin_emails_not_configured',
      detail: 'Set ADMIN_EMAILS env (comma-separated).',
    }
  }

  const email = (user.email || '').toLowerCase()
  if (!email || !allow.includes(email)) {
    return {
      ok: false as const,
      status: 403,
      error: 'not_allowed_email',
      detail: `Email not allowed: ${user.email ?? '(no email)'}`,
    }
  }

  return { ok: true as const, user }
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
      .select('id, keyword, order')
      .order('order', { ascending: true })

    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}

export async function POST(req: Request) {
  const gate = await requireAdminEmail()
  if (!gate.ok) return jsonErr(gate.status, gate.error, gate.detail)

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const keyword = String(body?.keyword ?? '').trim()
  const order = Number(body?.order)

  if (!keyword) return jsonErr(400, 'bad_request', 'keyword is required')
  if (Number.isNaN(order)) return jsonErr(400, 'bad_request', 'order must be a number')

  try {
    const admin = adminDb()
    const { error } = await admin.from(TABLE).insert([{ keyword, order } as any])
    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}

export async function PUT(req: Request) {
  const gate = await requireAdminEmail()
  if (!gate.ok) return jsonErr(gate.status, gate.error, gate.detail)

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const id = String(body?.id ?? '').trim()
  const keyword = String(body?.keyword ?? '').trim()
  const order = Number(body?.order)

  if (!id) return jsonErr(400, 'bad_request', 'id is required')
  if (!keyword) return jsonErr(400, 'bad_request', 'keyword is required')
  if (Number.isNaN(order)) return jsonErr(400, 'bad_request', 'order must be a number')

  try {
    const admin = adminDb()
    const { error } = await admin.from(TABLE).update({ keyword, order } as any).eq('id', id)
    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}

export async function DELETE(req: Request) {
  const gate = await requireAdminEmail()
  if (!gate.ok) return jsonErr(gate.status, gate.error, gate.detail)

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
