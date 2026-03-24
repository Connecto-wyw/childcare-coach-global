import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'

async function createSupabase() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => { try { cookieStore.set({ name, value, ...options }) } catch {} },
      remove: (name, options) => { try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }) } catch {} },
    },
  })
}

// GET: 전체 팀 목록 + is_featured 상태
export async function GET() {
  try {
    const supabase = await createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })

    const { data, error } = await (supabase as any)
      .from('teams')
      .select('id, name, image_url, tag1, tag2, is_active, is_featured')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 })
  }
}

// POST: { featuredIds: string[] } → 해당 ID만 is_featured=true, 나머지 false
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })

    const { featuredIds } = await req.json()
    if (!Array.isArray(featuredIds)) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 })
    }

    // 전체 false 처리 후 선택된 것만 true
    const { error: clearErr } = await (supabase as any)
      .from('teams')
      .update({ is_featured: false })
      .neq('id', '00000000-0000-0000-0000-000000000000') // all rows

    if (clearErr) return NextResponse.json({ ok: false, error: clearErr.message }, { status: 500 })

    if (featuredIds.length > 0) {
      const { error: setErr } = await (supabase as any)
        .from('teams')
        .update({ is_featured: true })
        .in('id', featuredIds)
      if (setErr) return NextResponse.json({ ok: false, error: setErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
