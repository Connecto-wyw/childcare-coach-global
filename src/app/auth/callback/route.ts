// src/app/auth/callback/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

type GoogleIdentityData = {
  sub?: string
  id?: string
  email?: string | null
  name?: string | null
  given_name?: string | null
  family_name?: string | null
  picture?: string | null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/coach'
  const origin = url.origin

  const supabase = createRouteHandlerClient<Database>({ cookies })

  // code 없으면 그냥 next로
  if (!code) return NextResponse.redirect(new URL(next, origin))

  // 1) OAuth code -> session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?message=${encodeURIComponent(exchangeError.message)}`, origin)
    )
  }

  // 2) session 기준 user 가져오기
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    // 세션은 생겼는데 user fetch가 실패한 케이스
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?message=${encodeURIComponent(userError?.message ?? 'No user')}`, origin)
    )
  }

  // 3) (선택) oauth_accounts upsert — 실패해도 로그인은 성공 처리
  try {
    const google = (user.identities ?? []).find((i) => i.provider === 'google')
    if (google) {
      const raw = (google.identity_data ?? {}) as Partial<GoogleIdentityData>

      const provider_user_id = String(raw.sub ?? raw.id ?? '')
      const email = raw.email ?? user.email ?? null
      const nickname = raw.name ?? raw.given_name ?? null
      const profile_image_url = raw.picture ?? null

      // provider_user_id가 비어있으면 upsert 의미 없으니 스킵
      if (provider_user_id) {
        const { error: upsertError } = await supabase.from('oauth_accounts').upsert(
          {
            user_id: user.id,
            provider: 'google',
            provider_user_id,
            email,
            nickname,
            profile_image_url,
            raw, // jsonb column
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' }
        )

        // upsertError는 throw 하지 않음 (콜백 500 방지)
        // 필요하면 나중에 서버 로그로만 남기도록 별도 처리 가능
        void upsertError
      }
    }
  } catch {
    // 콜백은 "절대 500" 내지 말고 그냥 통과시킴
  }

  return NextResponse.redirect(new URL(next, origin))
}
