// src/app/auth/callback/LoginButton.tsx
'use client'

import { useMemo } from 'react'
import { getSupabaseBrowserClient } from '@/lib/browser'
import { googleSignInWithSelectAccount } from '@/lib/googleSignIn'

export default function LoginButton() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const signIn = async () => {
    try {
      await googleSignInWithSelectAccount(supabase)
    } catch (e) {
      console.error('[googleSignIn] error:', e)
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      className="rounded-lg bg-black px-4 py-2 text-white text-sm font-semibold"
    >
      Sign in with Google
    </button>
  )
}