// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

export async function GET(req: Request) {
  const url = new URL(req.url)

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

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

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // NextResponse에서 Set-Cookie를 내려야 브라우저에 저장됨
        // 여기서는 아래 NextResponse에 반영하기 위해 일단 store에 반영
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
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

  // 로그인 성공 후 이동 (너 메인 페이지가 /coach)
  return NextResponse.redirect(new URL('/coach', url.origin))
}
