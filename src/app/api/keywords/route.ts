// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getServerSupabase(): {
  error: 'missing_env' | null
  client: SupabaseClient | null
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { error: 'missing_env', client: null }
  }
  const client = createClient(url, key, { auth: { persistSession: false } })
  return { error: null, client }
}

type Body = { email?: string; keyword?: string; order?: number }

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body
  const email = (body.email ?? '').toLowerCase()
  const keyword = (body.keyword ?? '').trim()
  const order = Number(body.order)

  if (!email.endsWith('@connecto-wyw.com')) {
    return NextResponse.json({ error: 'invalid_domain' }, { status: 403 })
  }
  if (!keyword || Number.isNaN(order)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { error, client } = getServerSupabase()
  if (error || !client) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 })
  }

  const { error: dbError } = await client
    .from('popular_keywords')
    .insert([{ keyword, order }])

  if (dbError) {
    return NextResponse.json(
      { error: 'db_error', detail: dbError.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
