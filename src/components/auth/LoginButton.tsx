'use client'

import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'

export default function LoginButton() {
  const supabase = useSupabaseClient()
  const user = useUser()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.NEXT_PUBLIC_SITE_URL, // ✅ 명시적 리디렉션
      },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (user) {
    return (
      <div className="flex gap-2 items-center">
        <span>{user.email}</span>
        <Button onClick={handleLogout}>로그아웃</Button>
      </div>
    )
  }

  return <Button onClick={handleLogin}>구글 로그인</Button>
}
