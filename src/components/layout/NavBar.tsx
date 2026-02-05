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

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

function getSiteOrigin() {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envSite) return stripTrailingSlash(envSite)
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

function safeText(v: unknown) {
  return String(v ?? '').trim()
}

function CoinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4Zm0 2c4.42 0 7 .98 7 2s-2.58 2-7 2-7-.98-7-2 2.58-2 7-2Zm0 14c-4.42 0-7-.98-7-2v-2.1C6.58 16.02 9.1 16.5 12 16.5s5.42-.48 7-1.6V17c0 1.02-2.58 2-7 2Zm0-4.5c-4.42 0-7-.98-7-2v-2.1C6.58 11.52 9.1 12 12 12s5.42-.48 7-1.6V12.5c0 1.02-2.58 2-7 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function NavBar() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuthUser()

  const [nickname, setNickname] = useState<string>('') // profiles.nickname (fallback)
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

  // ✅ 구글 계정 이름(닉네임) 가져오기: user_metadata 기반
  const googleName = useMemo(() => {
    if (!user) return ''
    const meta: any = user.user_metadata ?? {}
    return safeText(meta.full_name) || safeText(meta.name) || safeText(meta.email) || safeText(user.email)
  }, [user])

  // ✅ 화면에 표시할 이름 우선순위: GoogleName > profiles.nickname
  const displayName = useMemo(() => {
    return safeText(googleName) || safeText(nickname)
  }, [googleName, nickname])

  const loadProfileNickname = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('[profiles.nickname] error:', error)
      setNickname('')
      return
    }
    setNickname(safeText((data as any)?.nickname))
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
    void loadProfileNickname()
    void loadPoints()
  }, [user?.id, loadProfileNickname, loadPoints])

  // ✅ 포인트 갱신 이벤트: 로그인 상태에서만 동작
  useEffect(() => {
    const handler = () => {
      if (!user) return
      void loadPoints()
    }
    window.addEventListener('points:refresh', handler)
    return () => window.removeEventListener('points:refresh', handler)
  }, [user, loadPoints])

  const loginGoogle = useCallback(async () => {
    const base = getSiteOrigin()
    const redirectTo = `${base}/auth/callback?next=/coach`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }, [supabase])

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

        {/* Right: points + name OR google login */}
        <div className="flex items-center gap-3 min-w-0">
          {authLoading ? (
            <span className="text-[12px] text-gray-500">Loading…</span>
          ) : user ? (
            <>
              {/* ✅ Points (English) + icon */}
              <span className="flex items-center gap-1 text-[12px] text-gray-700 whitespace-nowrap">
                <CoinIcon className="w-4 h-4 text-gray-700" />
                <span className="font-semibold">Points:</span>
                <span>{loadingPoints ? '…' : format(points)}</span>
              </span>

              {/* ✅ Google nickname (or fallback) */}
              {displayName ? (
                <span className="text-[12px] font-semibold text-[#1e1e1e] truncate max-w-[180px]">
                  {displayName}
                </span>
              ) : null}
            </>
          ) : (
            <button
              onClick={loginGoogle}
              className="h-8 px-3 rounded-md bg-[#1e1e1e] text-white text-[12px] font-semibold"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
