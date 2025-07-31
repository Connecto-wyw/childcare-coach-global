'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function NavBar() {
  const [activeMenu, setActiveMenu] = useState<'home' | 'news' | 'team'>('home')

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/news')) setActiveMenu('news')
    else if (path.startsWith('/team')) setActiveMenu('team')
    else setActiveMenu('home')
  }, [])

  return (
    <nav className="w-full bg-[#191919] text-[#eae3de] border-b border-gray-700">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex gap-6 text-base font-medium">
          <Link
            href="/"
            onClick={() => setActiveMenu('home')}
            className={`transition ${
              activeMenu === 'home' ? 'text-[#9F1D23] font-semibold' : 'hover:text-[#9F1D23]'
            }`}
          >
            HOME
          </Link>
          <Link
            href="/news"
            onClick={() => setActiveMenu('news')}
            className={`transition ${
              activeMenu === 'news' ? 'text-[#9F1D23] font-semibold' : 'hover:text-[#9F1D23]'
            }`}
          >
            NEWS
          </Link>
          <Link
            href="/team"
            onClick={() => setActiveMenu('team')}
            className={`transition ${
              activeMenu === 'team' ? 'text-[#9F1D23] font-semibold' : 'hover:text-[#9F1D23]'
            }`}
          >
            TEAM
          </Link>
        </div>
      </div>
    </nav>
  )
}
