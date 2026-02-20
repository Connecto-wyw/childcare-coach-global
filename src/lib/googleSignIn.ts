// src/lib/googleSignIn.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function googleSignInWithSelectAccount(supabase: SupabaseClient) {
  // ✅ 1) 서버 쿠키 세션부터 강제 삭제
  try {
    await fetch('/api/auth/signout', { method: 'POST' })
  } catch {}

  // ✅ 2) 클라이언트 세션도 삭제(이중 안전)
  try {
    await supabase.auth.signOut({ scope: 'global' })
  } catch {}

  const redirectTo = `${window.location.origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        // ✅ 계정 선택 강제 + consent
        prompt: 'select_account consent',
      },
    },
  })

  if (error) throw error
}