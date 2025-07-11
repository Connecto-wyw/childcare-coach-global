'use client'

import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'

type Props = {
  children?: React.ReactNode
}

export default function LoginButton({ children }: Props) {
  const supabase = useSupabaseClient()
  const user = useUser()

  const handleLogin = async () => {
    const redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/coach'
        : 'https://childcare-coach-pro.vercel.app/auth/callback'

    console.log(`🔁 redirectTo: ${redirectUrl}`)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
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

  return <Button onClick={handleLogin}>{children || '구글 로그인'}</Button>
}
