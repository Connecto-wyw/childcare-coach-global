import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type OkRes = { ok: true; points_awarded?: number; claim_date?: string }
type ErrRes = { ok: false; reason: string; error?: string }

export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr) {
      const out: ErrRes = { ok: false, reason: 'auth_error', error: authErr.message }
      return NextResponse.json(out, { status: 200 })
    }

    if (!user) {
      const out: ErrRes = { ok: false, reason: 'not_authenticated' }
      return NextResponse.json(out, { status: 200 })
    }

    // ✅ RPC 호출 (DB에서 ok/reason 내려옴)
    const { data, error } = await supabase.rpc('claim_daily_reward')

    if (error) {
      const out: ErrRes = { ok: false, reason: 'rpc_error', error: error.message }
      return NextResponse.json(out, { status: 200 })
    }

    // claim_daily_reward() 가 json 반환하므로 그대로 전달
    // (ok/reason/points_awarded/claim_date 포함)
    return NextResponse.json(data as any, { status: 200 })
  } catch (e: any) {
    const out: ErrRes = { ok: false, reason: 'server_error', error: String(e?.message ?? e) }
    return NextResponse.json(out, { status: 200 })
  }
}
