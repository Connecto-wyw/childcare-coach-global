// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

function decodeRepeatedly(value: string, max = 2) {
  let current = value

  for (let i = 0; i < max; i += 1) {
    try {
      const decoded = decodeURIComponent(current)
      if (decoded === current) break
      current = decoded
    } catch {
      break
    }
  }

  return current
}

function safeNextPath(raw: string | null) {
  if (!raw) return '/coach'

  const decoded = decodeRepeatedly(raw.trim())

  // 내부 경로만 허용
  if (!decoded.startsWith('/')) return '/coach'
  if (decoded.startsWith('//')) return '/coach'

  return decoded
}

export async function GET(req: Request) {
  const url = new URL(req.url)

  console.log('[AUTH CALLBACK] Full URL:', req.url);
  console.log('[AUTH CALLBACK] next param raw:', url.searchParams.get('next'));

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const cookieStore = await cookies()

  // 1. URL의 next 파라미터 확인 (호환성 유지)
  // 2. 만약 없거나 짤렸다면, 우리가 심어둔 kyk_auth_return 쿠키 확인
  const fallbackNext = cookieStore.get('kyk_auth_return')?.value || null
  const rawNext = url.searchParams.get('next') || fallbackNext
  const nextPath = safeNextPath(rawNext)

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

  const res = NextResponse.redirect(new URL(nextPath, url.origin))

  // ✅ 사용한 리다이렉트 쿠키 삭제
  res.cookies.set('kyk_auth_return', '', { maxAge: 0, path: '/' })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
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