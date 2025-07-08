'use client'

import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button' // UI 컴포넌트 라이브러리에 맞게 조정

export default function LoginButton() {
  const supabase = useSupabaseClient()
  const user = useUser()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
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
