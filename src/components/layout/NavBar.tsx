// src/components/layout/NavBar.tsx
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

type NavItem = {
  label: string
  href: string
}

function format(n: number) {
  try {
    return n.toLocaleString('en-US')
  } catch {
    return String(n)
  }
}

export default function NavBar() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuthUser()

  const [nickname, setNickname] = useState<string>('')
  const [points, setPoints] = useState<number>(0)
  const [loadingPoints, setLoadingPoints] = useState(false)

  const items: NavItem[] = useMemo(
    () => [
      { label: 'COACH', href: '/coach' },
      { label: 'NEWS', href: '/news' },
      { label: 'TEAM', href: '/team' },
      { label: 'REWARD', href: '/reward' },
    ],
    []
  )

  const loadProfile = useCallback(async () => {
    if (!user) {
      setNickname('')
      return
    }

    const { data, error } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('[profiles.nickname] error:', error)
      setNickname('')
      return
    }

    setNickname(String((data as any)?.nickname ?? ''))
  }, [supabase, user])

  const loadPoints = useCallback(async () => {
    if (!user) {
      setPoints(0)
      return
    }

    setLoadingPoints(true)
    const { data, error } = await supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
    setLoadingPoints(false)

    if (error) {
      console.error('[profiles.points] error:', error)
      return
    }

    setPoints(Number((data as any)?.points ?? 0))
  }, [supabase, user])

  // ✅ 로그인/로그아웃 변화 시 닉네임/포인트 로드
  useEffect(() => {
    if (!user) {
      setNickname('')
      setPoints(0)
      return
    }
    void loadProfile()
    void loadPoints()
  }, [user?.id, loadProfile, loadPoints])

  // ✅ 포인트 갱신 이벤트(RewardClient, ChatBox 등에서 dispatchEvent('points:refresh') 하면 NavBar 갱신)
  useEffect(() => {
    const handler = () => {
      if (!user) return
      void loadPoints()
    }
    window.addEventListener('points:refresh', handler)
    return () => window.removeEventListener('points:refresh', handler)
  }, [user, loadPoints])

  const greeting = useMemo(() => {
    if (!user) return ''
    const name = nickname?.trim() ? nickname.trim() : 'there'
    return `${name}님 반가워요!`
  }, [user, nickname])

  return (
    <header className="w-full bg-white border-b border-[#eeeeee]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: menu */}
        <nav className="flex items-center gap-4">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="text-[13px] font-semibold text-[#1e1e1e] hover:opacity-70"
            >
              {it.label}
            </Link>
          ))}
        </nav>

        {/* Right: user info */}
        <div className="flex items-center gap-3 min-w-0">
          {authLoading ? (
            <span className="text-[12px] text-gray-500">Loading…</span>
          ) : user ? (
            <>
              {/* ✅ 닉네임 왼쪽: 보유 포인트 */}
              <span className="text-[12px] text-gray-700 whitespace-nowrap">
                보유 포인트 : {loadingPoints ? '…' : format(points)}
              </span>

              {/* ✅ 로그인 시: “OOO님 반가워요!” */}
              <span className="text-[12px] font-semibold text-[#1e1e1e] truncate">{greeting}</span>
            </>
          ) : (
            <span className="text-[12px] text-gray-500">Not signed in</span>
          )}
        </div>
      </div>
    </header>
  )
}
