'use client'

import { supabase } from '@/lib/supabaseClient'

export default function LoginButton() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: 'https://hrvbdyusoybsviiuboac.supabase.co/auth/v1/callback',
      },
    })
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <button
        onClick={handleLogin}
        className="w-full py-2 px-4 rounded-md bg-yellow-300 text-black hover:bg-yellow-400"
      >
        💬 카카오톡으로 로그인
      </button>
    </div>
  )
}
