// src/app/api/kyk/save/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const DRAFT_COOKIE = 'kyk_draft'

type SaveBody = {
  answers: any // (너의 KYKAnswers 타입을 그대로 보내면 됨)
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const body = (await req.json().catch(() => null)) as SaveBody & { draft_id?: string } | null
    const draftId = cookieStore.get(DRAFT_COOKIE)?.value || body?.draft_id

    if (!draftId) {
      return NextResponse.json({ ok: false, error: 'no draft' }, { status: 400 })
    }

    if (!body?.answers) {
      return NextResponse.json({ ok: false, error: 'missing answers' }, { status: 400 })
    }

    const supabaseAdmin = admin()

    const { error } = await supabaseAdmin
      .from('kyk_drafts')
      .update({ answers: body.answers })
      .eq('id', draftId)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}