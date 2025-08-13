'use client'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function LoginButton() {
  const supabase = useSupabaseClient()
  return (
    <button
      onClick={async () => {
        await supabase.auth.signInWithOAuth({
          provider: 'kakao',
          options: { redirectTo: `${location.origin}/auth/callback` },
        })
      }}
      className="px-4 py-2 rounded bg-[#3fb1df] text-white"
    >
      카카오로 계속하기
    </button>
  )
}
