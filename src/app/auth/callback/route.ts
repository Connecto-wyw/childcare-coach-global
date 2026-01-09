// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/coach'
  const origin = url.origin

  const redirectUrl = new URL(next, origin)
  const response = NextResponse.redirect(redirectUrl)

  // code 없으면 그냥 이동
  if (!code) return response

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      new URL(
        `/auth/auth-code-error?message=${encodeURIComponent(
          'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
        )}`,
        origin
      )
    )
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // request 쿠키 읽기
      getAll() {
        return request.cookies.getAll()
      },
      // response 쿠키 세팅 (세션 쿠키 저장)
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?message=${encodeURIComponent(error.message)}`, origin)
    )
  }

  return response
}
