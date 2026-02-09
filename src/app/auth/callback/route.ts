// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // ✅ open redirect 방지: next는 "내 사이트 내부 경로"만 허용
  const nextRaw = url.searchParams.get('next') ?? '/coach'
  const nextPath = nextRaw.startsWith('/') ? nextRaw : '/coach'

  // ✅ response 먼저 만들고 여기에 쿠키를 SET 해서 내려보냄
  const response = NextResponse.redirect(new URL(nextPath, url.origin))

  // ✅ Next 16: cookies()가 Promise로 잡힐 수 있어서 await 필요
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const errUrl = new URL('/auth/auth-code-error', url.origin)
      errUrl.searchParams.set('message', error.message)
      return NextResponse.redirect(errUrl)
    }
  }

  return response
}
