import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/coach'
  const origin = url.origin

  // code가 없으면 그냥 next로 보냄
  if (!code) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  // 여기서 터지면 500 대신 명시적으로 에러 페이지로 보냄(디버깅 쉬움)
  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?message=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
