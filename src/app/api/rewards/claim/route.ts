// src/app/api/rewards/claim/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    const supabase = createRouteHandlerClient<Database>({
      cookies,
    })

    // ✅ 세션 확인
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { ok: false, reason: 'not_authenticated' },
        { status: 200 }
      )
    }

    // ✅ RPC 호출
    const { data, error } = await supabase.rpc('claim_daily_reward')

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json(
        { ok: false, reason: 'rpc_error', error: error.message },
        { status: 200 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (e: any) {
    console.error('SERVER ERROR', e)
    return NextResponse.json(
      { ok: false, reason: 'server_error', error: String(e?.message ?? e) },
      { status: 200 }
    )
  }
}
