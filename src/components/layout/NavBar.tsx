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

function safeName(input: string) {
  const s = (input ?? '').trim()
  return s
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

  // ✅ 로그인 여부가 바뀔 때마다 상태 정리(비로그인이면 싹 리셋)
  useEffect(() => {
    if (!user) {
      setNickname('')
      setPoints(0)
      setLoadingPoints(false)
    }
  }, [user])

  const loadProfile = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('[profiles.nickname] error:', error)
      setNickname('')
      return
    }

    setNickname(String((data as any)?.nickname ?? ''))
  }, [supabase, user])

  const loadPoints = useCallback(async () => {
    if (!user) return

    setLoadingPoints(true)
    const { data, error } = await supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
    setLoadingPoints(false)

    if (error) {
      console.error('[profiles.points] error:', error)
      setPoints(0)
      return
    }

    setPoints(Number((data as any)?.points ?? 0))
  }, [supabase, user])

  // ✅ 로그인 시에만 닉네임/포인트 로드
  useEffect(() => {
    if (!user) return
    void loadProfile()
    void loadPoints()
  }, [user?.id, loadProfile, loadPoints])

  // ✅ 포인트 갱신 이벤트: 로그인 상태에서만 동작
  useEffect(() => {
    const handler = () => {
      if (!user) return
      void loadPoints()
    }
    window.addEventListener('points:refresh', handler)
    return () => window.removeEventListener('points:refresh', handler)
  }, [user, loadPoints])

  /**
   * ✅ 핵심 수정:
   * - 비로그인 상태에서는 greeting 자체를 만들지 않음(절대 there fallback 노출 X)
   * - 로그인 상태에서도 nickname이 비었으면 "there" 같은 fallback 금지 -> 그냥 인사 문구 숨김
   */
  const greeting = useMemo(() => {
    if (!user) return ''
    const name = safeName(nickname)
    if (!name) return ''
    return `${name}님 반가워요!`
  }, [user, nickname])

  return (
    <header className="w-full bg-white border-b border-[#eeeeee]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: menu */}
        <nav className="flex items-center gap-4">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="text-[13px] font-semibold text-[#1e1e1e] hover:opacity-70">
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
              {/* ✅ 로그인 시에만 포인트 표시 */}
              <span className="text-[12px] text-gray-700 whitespace-nowrap">
                보유 포인트 : {loadingPoints ? '…' : format(points)}
              </span>

              {/* ✅ 닉네임이 있을 때만 “OOO님 반가워요!” 표시 (there 같은 기본값 금지) */}
              {greeting ? (
                <span className="text-[12px] font-semibold text-[#1e1e1e] truncate">{greeting}</span>
              ) : null}
            </>
          ) : (
            <span className="text-[12px] text-gray-500">Not signed in</span>
          )}
        </div>
      </div>
    </header>
  )
}
