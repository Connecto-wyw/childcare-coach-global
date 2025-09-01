// src/app/auth/callback/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

// Minimal Google identity shape
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

  const supabase = createRouteHandlerClient<Database>({ cookies })

  if (code) {
    // Create session from OAuth code
    await supabase.auth.exchangeCodeForSession(code)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Find Google identity
      const google = (user.identities ?? []).find((i) => i.provider === 'google')
      if (google) {
        const raw = (google.identity_data ?? {}) as Partial<GoogleIdentityData>

        const provider_user_id = String(raw.sub ?? raw.id ?? '')
        const email = raw.email ?? user.email ?? null
        const nickname = raw.name ?? raw.given_name ?? null
        const profile_image_url = raw.picture ?? null

        // Upsert into your oauth_accounts table
        await supabase.from('oauth_accounts').upsert(
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
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
