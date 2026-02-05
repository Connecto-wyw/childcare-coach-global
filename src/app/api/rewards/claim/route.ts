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
    return NextResponse.json({ ok: false, reason: 'server_error', error: error.message }, { status: 500 })
  }

  // data 자체가 json 형태로 내려옴: { ok, reason, points_awarded, claim_date }
  return NextResponse.json(data)
}
