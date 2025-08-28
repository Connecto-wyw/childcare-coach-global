// src/app/auth/callback/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

// 카카오 identity 데이터 최소 타입
type KakaoIdentityData = {
  id?: string | number
  sub?: string | number
  email?: string
  properties?: { nickname?: string | null; profile_image?: string | null } | null
  kakao_account?: {
    email?: string | null
    profile?: { nickname?: string | null; profile_image_url?: string | null } | null
  } | null
  picture?: string | null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/coach'

  const supabase = createRouteHandlerClient<Database>({ cookies })

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const kakao = (user.identities ?? []).find((i) => i.provider === 'kakao')
      if (kakao) {
        const raw = (kakao.identity_data ?? {}) as Partial<KakaoIdentityData>

        const provider_user_id = String(raw.id ?? raw.sub ?? '')
        const email =
          raw.email ?? raw.kakao_account?.email ?? null
        const nickname =
          raw.properties?.nickname ??
          raw.kakao_account?.profile?.nickname ??
          null
        const profile_image_url =
          raw.properties?.profile_image ??
          raw.kakao_account?.profile?.profile_image_url ??
          raw.picture ??
          null

        await supabase.from('oauth_accounts').upsert(
          {
            user_id: user.id,
            provider: 'kakao',
            provider_user_id,
            email,
            nickname,
            profile_image_url,
            raw, // jsonb 컬럼
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' },
        )
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
