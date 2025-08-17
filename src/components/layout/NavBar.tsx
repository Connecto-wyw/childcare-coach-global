// src/components/layout/NavBar.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'

type Menu = 'news' | 'talk'

export default function NavBar() {
  const user = useUser()
  const [active, setActive] = useState<Menu>('news')

  useEffect(() => {
    const p = window.location.pathname
    if (p.startsWith('/team')) setActive('talk')
    else setActive('news') // /home, /coach 포함 기본값
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <nav className="w-full bg-[#191919] text-[#eae3de] border-b border-gray-700">
      {/* 3영역 고정: 좌(로고) · 중(메뉴) · 우(액션) */}
      <div className="mx-auto max-w-5xl px-4 h-14 grid grid-cols-3 items-center">
        {/* 좌측: 로고 */}
        <div className="justify-self-start">
          <Link href="/home" className="text-base font-semibold hover:text-[#9F1D23]">
            인디언밥
          </Link>
        </div>

        {/* 중앙: 메뉴 */}
        <div className="justify-self-center flex gap-6 text-base font-medium">
          <Link
            href="/news"
            onClick={() => setActive('news')}
            className={`transition ${
              active === 'news' ? 'text-[#9F1D23] font-semibold' : 'hover:text-[#9F1D23]'
            }`}
          >
            NEWS
          </Link>
          <Link
            href="/team"
            onClick={() => setActive('talk')}
            className={`transition ${
              active === 'talk' ? 'text-[#9F1D23] font-semibold' : 'hover:text-[#9F1D23]'
            }`}
          >
            TALK
          </Link>
        </div>

        {/* 우측: 로그인 시에만 로그아웃 버튼 */}
        <div className="justify-self-end">
          {user ? (
            <button
              onClick={logout}
              className="rounded-md border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
            >
              로그아웃
            </button>
          ) : (
            <span className="inline-block w-[84px]" />
          )}
        </div>
      </div>
    </nav>
  )
}
