'use client'

import Logo from '@/components/Logo'
import ChatBox from '@/components/chat/ChatBox'
import TipSection from '@/components/tips/TipSection'
import NavBar from '@/components/layout/NavBar'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'

export default function CoachPage() {
  const user = useUser()
  const supabaseClient = useSupabaseClient()

  const handleLogin = async () => {
    await supabaseClient.auth.signInWithOAuth({ provider: 'google' })
  }

  const handleLogout = async () => {
    await supabaseClient.auth.signOut()
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        {/* 챗봇 */}
        <div className="mb-12">
          <ChatBox />
        </div>

        {/* 오늘의 팁 */}
        <TipSection />

        {/* 로그인/로그아웃 버튼 */}
        {!user ? (
          <Button onClick={handleLogin} className="bg-[#8a1a1d] mt-6">
            구글 로그인
          </Button>
        ) : (
          <Button onClick={handleLogout} className="bg-[#3EB6F1] mt-6">
            로그아웃
          </Button>
        )}
      </div>
    </main>
  )
}
