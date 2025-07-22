'use client'

import Link from 'next/link'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NavBar() {
  const user = useUser()
  const router = useRouter()
  const [activeMenu, setActiveMenu] = useState<'news' | 'team'>('news') // 기본 NEWS 활성화

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/coach') // 로그아웃 후 기본 페이지로 이동
  }

  return (
    <nav className="w-full bg-[#191919] text-[#eae3de] border-b border-gray-700">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* 왼쪽 메뉴 */}
        <div className="flex gap-6 text-base font-medium">
          <Link
            href="/coach#news"
            onClick={() => setActiveMenu('news')}
            className={`transition ${
              activeMenu === 'news' ? 'text-[#9F1D23] font-semibold' : 'hover:text-[#9F1D23]'
            }`}
          >
            NEWS
          </Link>
          <Link
            href="/coach#team"
            onClick={() => setActiveMenu('team')}
            className={`transition ${
              activeMenu === 'team' ? 'text-[#9F1D23] font-semibold' : 'hover:text-[#9F1D23]'
            }`}
          >
            TEAM
          </Link>
        </div>

        {/* 오른쪽 로그인/로그아웃 */}
        <div className="flex gap-4 text-base font-medium">
          {user ? (
            <button
              onClick={handleLogout}
              className="hover:text-[#9F1D23] transition"
            >
              로그아웃
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="hover:text-[#9F1D23] transition"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
