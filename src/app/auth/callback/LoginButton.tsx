// src/app/auth/callback/LoginButton.tsx
'use client'

import { useCallback } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function LoginButton() {
  const supabase = useSupabaseClient()
  const { auth } = supabase

  const signInWithGoogle = useCallback(async () => {
    await auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }, [auth])

  return (
    <button
      onClick={signInWithGoogle}
      className="px-3 py-2 rounded bg-black text-white"
    >
      Google로 로그인
    </button>
  )
}
