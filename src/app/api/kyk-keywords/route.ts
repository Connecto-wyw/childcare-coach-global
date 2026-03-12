// src/app/api/kyk-keywords/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TABLE = 'kyk_admin_keywords' as any

function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status })
}

function parseAllowEmails() {
  const raw = process.env.ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
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

// GET: public read allowed for result page resolution
export async function GET() {
  try {
    const admin = adminDb()
    const { data, error } = await admin
      .from(TABLE)
      .select('mbti_type, keywords, updated_at')
      // return all rows
      .order('mbti_type', { ascending: true })

    if (error) return jsonErr(500, 'db_error', error.message)
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}

// POST: authenticated admin update for a given mbti_type
export async function POST(req: Request) {
  const gate = await requireAdminEmail()
  if (!gate.ok) return jsonErr(gate.status, gate.error, gate.detail)

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const mbti_type = String(body?.mbti_type ?? '').trim().toLowerCase()
  const keywords = Array.isArray(body?.keywords) ? body.keywords.map(String).map((s: string) => s.trim()) : []

  if (!mbti_type) return jsonErr(400, 'bad_request', 'mbti_type is required')
  if (keywords.length > 3) return jsonErr(400, 'bad_request', 'maximum 3 keywords allowed')

  try {
    const admin = adminDb()
    
    const { error } = await admin.from(TABLE as any).upsert({ 
      mbti_type, 
      keywords 
    }, { onConflict: 'mbti_type' })
    
    if (error) return jsonErr(500, 'db_error', error.message)
    
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return jsonErr(500, 'server_error', e?.message ?? String(e))
  }
}
