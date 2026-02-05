import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('claim_daily_reward')

  if (error) {
    return NextResponse.json(
      { ok: false, reason: 'server_error', error: error.message },
      { status: 500 }
    )
  }

  // ✅ RPC가 어떤 형태로 오든 여기서 표준화
  const payload: any = data ?? {}

  // (A) 우리가 기대한 ok/reason 형태로 이미 오면 그대로
  if (typeof payload.ok === 'boolean') {
    return NextResponse.json(payload, { status: 200 })
  }

  // (B) claimed 기반 형태면 변환
  if (typeof payload.claimed === 'boolean') {
    if (payload.claimed === true) {
      return NextResponse.json(
        {
          ok: true,
          points_awarded: Number(payload.awarded_points ?? payload.points_awarded ?? 0),
          claim_date: payload.today ?? payload.claim_date ?? null,
        },
        { status: 200 }
      )
    }

    // claimed=false인 경우: 이유가 내려오는지 보고 매핑
    const reason = String(payload.reason ?? '').trim()

    if (reason === 'no_question_today') {
      return NextResponse.json({ ok: false, reason: 'no_question_today' }, { status: 200 })
    }

    // reason이 없거나 다른 값이면 "이미 받음"으로 처리
    return NextResponse.json({ ok: false, reason: 'already_claimed' }, { status: 200 })
  }

  // (C) 완전 예상 밖이면 디버그용으로 payload 포함
  return NextResponse.json(
    { ok: false, reason: 'bad_payload', payload },
    { status: 200 }
  )
}
