// src/app/auth/callback/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/coach'

  const supabase = createRouteHandlerClient<Database>({ cookies })

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
    // 로그인 직후 카카오 계정 동기화
    await fetch(new URL('/api/auth/sync', requestUrl.origin), { method: 'POST' })
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
