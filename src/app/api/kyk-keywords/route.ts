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
  const auth = await requireAdminAuth()
  if (!auth.ok) return jsonErr(auth.status, auth.error, auth.detail)

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
