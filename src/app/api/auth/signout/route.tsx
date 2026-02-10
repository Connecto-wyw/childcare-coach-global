import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anon) {
    return NextResponse.json({ ok: false, error: 'missing_supabase_env' }, { status: 500 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })

  // ✅ Supabase 세션 무효화 + 쿠키 제거 트리거
  await supabase.auth.signOut()

  // ✅ 혹시 남아있을 수 있는 쿠키까지 “확실히” 제거(가드)
  const toClear = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
  ]

  for (const name of toClear) {
    cookieStore.set({ name, value: '', path: '/', maxAge: 0 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
