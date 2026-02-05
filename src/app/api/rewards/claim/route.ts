import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEPLOY_MARK = 'claim-v4-next-cookies-async'

function getEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

async function getSupabaseRouteClient() {
  const cookieStore = await cookies() // ✅ 핵심: await

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })
}

export async function POST() {
  try {
    const supabase = await getSupabaseRouteClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr) {
      return NextResponse.json(
        { ok: false, reason: 'auth_error', error: userErr.message, deploy: DEPLOY_MARK },
        { status: 200 }
      )
    }

    if (!user) {
      return NextResponse.json({ ok: false, reason: 'not_authenticated', deploy: DEPLOY_MARK }, { status: 200 })
    }

    // ✅ DB RPC (claim_daily_reward) 호출
    const { data, error } = await supabase.rpc('claim_daily_reward')

    if (error) {
      return NextResponse.json(
        { ok: false, reason: 'rpc_error', error: error.message, deploy: DEPLOY_MARK },
        { status: 200 }
      )
    }

    // 함수가 json을 반환하므로 그대로 내려줌
    // { ok:true, points_awarded, claim_date } 또는 { ok:false, reason, error? }
    return NextResponse.json({ ...(data as any), deploy: DEPLOY_MARK }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: 'server_error', error: String(e?.message ?? e), deploy: DEPLOY_MARK },
      { status: 200 }
    )
  }
}
