// src/app/auth/callback/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/coach'

  const supabase = createRouteHandlerClient<Database>({ cookies })

  if (code) {
    // 세션 확립
    await supabase.auth.exchangeCodeForSession(code)

    // 카카오 프로필 → oauth_accounts 업서트
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const kakao = (user.identities ?? []).find(i => i.provider === 'kakao')
      if (kakao) {
        const raw: any = kakao.identity_data ?? {}
        const provider_user_id = String(raw.id ?? raw.sub ?? kakao.id ?? '')
        const email = raw.email ?? raw.kakao_account?.email ?? null
        const nickname =
          raw.properties?.nickname ??
          raw.kakao_account?.profile?.nickname ??
          raw.nickname ??
          null
        const profile_image_url =
          raw.properties?.profile_image ??
          raw.kakao_account?.profile?.profile_image_url ??
          raw.picture ??
          null

        await supabase.from('oauth_accounts').upsert({
          user_id: user.id,
          provider: 'kakao',
          provider_user_id,
          email,
          nickname,
          profile_image_url,
          raw,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' })
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
