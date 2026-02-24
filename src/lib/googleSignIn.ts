// src/lib/googleSignIn.ts
import type { SupabaseClient } from '@supabase/supabase-js'

type Options = {
  nextPath?: string
}

function origin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export async function googleSignInWithSelectAccount(supabase: SupabaseClient, opts: Options = {}) {
  const nextPath = opts.nextPath || '/coach'

  // ✅ 콜백은 무조건 여기로
  const redirectTo = `${origin()}/auth/callback?next=${encodeURIComponent(nextPath)}`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account', // ✅ 계정 선택 강제
      },
    },
  })

  if (error) throw error
}