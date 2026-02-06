'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
        d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ✅ Indianbob main color
const INDIANBOB_RED = '#9F1D23'

/**
 * ✅ EVENT Badge (NO overlap)
 * - 핵심: absolute를 버리고 "inline-flex"로 라벨 옆에 붙임
 * - 2px 간격: ml-[2px]
 * - nav 영역 조금 키움: header padding y 증가
 * - blink/pulse 유지 (Reduce motion 대응)
 */
function NavMiniBadge({ text = 'EVENT' }: { text?: string }) {
  return (
    <>
      <span
        className={[
          'nav-badge',
          'inline-flex',
          'items-center',
          'justify-center',
          'ml-[2px]', // ✅ REWARD와 2px 띄움
          'rounded-full',
          'px-[4px]',
          'py-[1px]',
          'text-[9px]',
          'font-extrabold',
          'leading-none',
          'text-white',
          'select-none',
          'pointer-events-none',
          'whitespace-nowrap',
          'align-top',
        ].join(' ')}
        style={{ backgroundColor: INDIANBOB_RED }}
      >
        {text}
      </span>

      <style jsx>{`
        .nav-badge {
          animation: indianbob-badge-pulse 1.2s ease-in-out infinite;
          transform-origin: center;
        }

        @keyframes indianbob-badge-pulse {
          0% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(159, 29, 35, 0.35);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
            box-shadow: 0 0 0 6px rgba(159, 29, 35, 0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(159, 29, 35, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nav-badge {
            animation: none !important;
          }
        }
      `}</style>
    </>
  )
}

export default function NavBar() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuthUser()

  const [nickname, setNickname] = useState<string>('')
  const [points, setPoints] = useState<number>(0)
  const [loadingPoints, setLoadingPoints] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // ✅ 뱃지 ON/OFF 및 텍스트
  const rewardBadgeText = 'EVENT'
  const showRewardBadge = true

  const items: NavItem[] = useMemo(
    () => [
      { label: 'COACH', href: '/coach' },
      { label: 'NEWS', href: '/news' },
      { label: 'TEAM', href: '/team' },
      { label: 'REWARD', href: '/reward' },
    ],
    []
  )

  useEffect(() => {
    if (!user) {
      setNickname('')
      setPoints(0)
      setLoadingPoints(false)
      setMenuOpen(false)
    }
  }, [user])

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuOpen) return
      const el = menuRef.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const googleName = useMemo(() => {
    if (!user) return ''
    const meta: any = user.user_metadata ?? {}
    return safeText(meta.full_name) || safeText(meta.name) || safeText(meta.email) || safeText(user.email)
  }, [user])

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

  useEffect(() => {
    if (!user) return
    void loadProfileNickname()
    void loadPoints()
  }, [user?.id, loadProfileNickname, loadPoints])

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

  const signOut = useCallback(async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
    try {
      window.location.href = '/coach'
    } catch {}
  }, [supabase])

  return (
    <header className="w-full bg-white border-b border-[#eeeeee]">
      {/* ✅ nav 영역 약간 키움: py-3 -> py-4 */}
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Left: menu */}
        <nav className="flex items-center gap-4">
          {items.map((it) => {
            const isReward = it.href === '/reward'
            return (
              <Link
                key={it.href}
                href={it.href}
                className={[
                  'text-[13px] font-semibold text-[#1e1e1e] hover:opacity-70',
                  // ✅ inline-flex로 라벨+뱃지를 같은 줄에서 정렬 (absolute 필요 없음)
                  isReward ? 'inline-flex items-center' : '',
                ].join(' ')}
              >
                <span>{it.label}</span>

                {/* ✅ REWARD 옆 EVENT 뱃지 (겹침 방지) */}
                {isReward && showRewardBadge ? <NavMiniBadge text={rewardBadgeText} /> : null}
              </Link>
            )
          })}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3 min-w-0">
          {authLoading ? (
            <span className="text-[12px] text-gray-500">Loading…</span>
          ) : user ? (
            <>
              <span
                className={[
                  'flex items-center gap-1 whitespace-nowrap',
                  'text-[12px] font-semibold',
                  'px-2 py-1 rounded-md',
                  'bg-[#F2F7FF] text-[#0B4DD6] border border-[#D6E6FF]',
                ].join(' ')}
              >
                <CoinIcon className="w-4 h-4 text-[#0B4DD6]" />
                <span>Points:</span>
                <span>{loadingPoints ? '…' : format(points)}</span>
              </span>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#1e1e1e] hover:opacity-80 max-w-[200px]"
                >
                  <span className="truncate">{displayName || 'Account'}</span>
                  <ChevronDownIcon className="w-4 h-4 text-[#1e1e1e]" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-md border border-[#e5e5e5] bg-white shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={signOut}
                      className="w-full text-left px-3 py-2 text-[12px] text-[#1e1e1e] hover:bg-[#f5f5f5]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button onClick={loginGoogle} className="h-8 px-3 rounded-md bg-[#1e1e1e] text-white text-[12px] font-semibold">
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
