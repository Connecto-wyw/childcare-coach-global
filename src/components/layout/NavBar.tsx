// src/components/layout/NavBar.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'

type Menu = 'home' | 'news' | 'talk'

export default function NavBar() {
  const user = useUser()
  const [active, setActive] = useState<Menu>('home')

  useEffect(() => {
    const p = window.location.pathname
    if (p.startsWith('/team')) setActive('talk')
    else if (p.startsWith('/news')) setActive('news')
    else setActive('home') // '/', '/coach' 포함
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const item = (href: string, key: Menu, label: string) => (
    <Link
      href={href}
      onClick={() => setActive(key)}
      className={`transition ${
        active === key
          ? 'text-[#9F1D23] font-semibold'
          : 'text-[#eae3de] hover:text-[#9F1D23]'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="w-full bg-[#191919] text-[#eae3de] border-b border-gray-700">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        {/* 좌측: 메뉴 */}
        <div className="flex gap-6 text-base font-medium">
          {item('/', 'home', 'HOME')}
          {item('/news', 'news', 'NEWS')}
          {item('/team', 'talk', 'TALK')}
        </div>

        {/* 우측: 로그인 시 로그아웃 버튼 */}
        <div>
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
