// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const url = new URL(req.url)

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  // ✅ 로그인 완료 후 돌아갈 경로(기본 /coach)
  const nextPath = url.searchParams.get('next') || '/coach'

  // Supabase에서 error 파라미터로 오면 바로 에러 페이지로
  if (error) {
    const msg = errorDescription ? `${error}: ${errorDescription}` : error
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?message=${encodeURIComponent(msg)}`, url.origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?message=${encodeURIComponent('Missing code')}`, url.origin)
    )
  }

  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

  // ✅ response에 Set-Cookie가 내려가야 브라우저에 세션 저장됨
  const res = NextResponse.redirect(new URL(nextPath, url.origin))

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // ✅ cookieStore에도 반영
          cookieStore.set(name, value, options)
          // ✅ 실제 응답에도 반영
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/auth/auth-code-error?message=${encodeURIComponent(exchangeError.message)}`,
        url.origin
      )
    )
  }

  return res
}