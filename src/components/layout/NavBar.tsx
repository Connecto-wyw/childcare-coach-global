'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'

export default function NavBar() {
  return (
    <nav className="w-full bg-[#191919] text-[#eae3de] border-b border-gray-700">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* 왼쪽 로고 */}
        <Link href="/coach" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl font-bold">인디언밥</span>
        </Link>

        {/* 오른쪽 메뉴 */}
        <div className="flex gap-6 text-base font-medium">
          <Link href="/coach#news" className="hover:text-[#9F1D23] transition">
            육아 뉴스
          </Link>
          <Link href="/coach#team" className="hover:text-[#9F1D23] transition">
            팀 게시판
          </Link>
        </div>
      </div>
    </nav>
  )
}
