// src/components/layout/NavBar.tsx
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
        d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4Zm0 2c4.42 0 7 .98 7 2s-2.58 2-7 2-7-.98-7-2 2.58-2 7-2Zm0 14c-4.42 0-7-.98-7-2v-2.1C6.58 16.02 9.1 16.5 12 16.5s5.42-.48 7-1.6V17c0 1.02-2.58 2-7 2Zm0-4.5c-4.42 0-7-.98-7-2v-2.1C6.58 11.52 9.1 12 12 12s5.42-.48 7-1.6V12.5c0 1.02-2.58 2-7 2Z"
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

const INDIANBOB_RED = '#9F1D23'

/**
 * ✅ TEAM BETA Badge (black pulse) - above TEAM (center)
 */
function NavBetaBadge({ text = 'BETA' }: { text?: string }) {
  return (
    <>
      <span
        className={[
          'beta-badge',
          'absolute',
          'rounded-full',
          'px-[6px]',
          'py-[1px]',
          'text-[9px]',
          'font-extrabold',
          'leading-none',
          'text-white',
          'select-none',
          'pointer-events-none',
          'whitespace-nowrap',
        ].join(' ')}
        style={{ backgroundColor: '#000000' }}
      >
        {text}
      </span>

      <style jsx>{`
        .beta-badge {
          left: 50%;
          top: -11px;
          transform: translateX(-50%);
          transform-origin: center;

          animation: beta-badge-pulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.18);
        }

        @keyframes beta-badge-pulse {
          0% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.22);
          }
          50% {
            opacity: 0.6;
            transform: translateX(-50%) scale(1.06);
            box-shadow: 0 0 0 6px rgba(0, 0, 0, 0);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .beta-badge {
            animation: none !important;
          }
        }
      `}</style>
    </>
  )
}

/**
 * ✅ REWARD "Comming Soon" Badge - above REWARD like TEAM(BETA)
 * - 기본은 중앙(50%)
 * - 텍스트가 길어서 겹치면 오른쪽으로 조금 미는 용도: left: 62% (원하면 58~70% 사이로 조절)
 */
function NavSoonBadge({ text = 'Comming Soon' }: { text?: string }) {
  return (
    <>
      <span
        className={[
          'soon-badge',
          'absolute',
          'rounded-full',
          'px-[7px]',
          'py-[2px]',
          'text-[9px]',
          'font-extrabold',
          'leading-none',
          'text-white',
          'select-none',
          'pointer-events-none',
          'whitespace-nowrap',
        ].join(' ')}
        style={{ backgroundColor: INDIANBOB_RED }}
      >
        {text}
      </span>

      <style jsx>{`
        .soon-badge {
          /* ✅ TEAM처럼 위에 올리되, 모자라면 오른쪽으로 살짝 */
          left: 62%;
          top: -12px;
          transform: translateX(-50%);
          transform-origin: center;

          animation: indianbob-badge-pulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 0 0 rgba(159, 29, 35, 0.25);
        }

        @keyframes indianbob-badge-pulse {
          0% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
            box-shadow: 0 0 0 0 rgba(159, 29, 35, 0.28);
          }
          50% {
            opacity: 0.6;
            transform: translateX(-50%) scale(1.06);
            box-shadow: 0 0 0 6px rgba(159, 29, 35, 0);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
            box-shadow: 0 0 0 0 rgba(159, 29, 35, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .soon-badge {
            animation: none !important;
          }
        }
      `}</style>
    </>
  )
}

function SoonModal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white border border-[#dcdcdc] p-6">
        <div className="text-[15px] font-extrabold text-[#1e1e1e]">{title}</div>
        <div className="mt-2 text-[14px] text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="h-10 px-5 rounded-md bg-[#1e1e1e] text-white text-[14px] font-semibold">
            OK
          </button>
        </div>
      </div>
    </div>
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

  const items: NavItem[] = useMemo(
    () => [
      { label: 'COACH', href: '/coach' },
      { label: 'NEWS', href: '/news' },
      { label: 'TEAM', href: '/team' },
      { label: 'REWARD', href: '/reward' },
    ],
    []
  )

  const [soonOpen, setSoonOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      setNickname('')
      setPoints(0)
      setLoadingPoints(false)
      setMenuOpen(false)
    }
  }, [user])

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

  const showTeamBadge = true
  const teamBadgeText = 'BETA'

  const showRewardBadge = true
  const rewardBadgeText = 'Comming Soon'

  const onClickReward = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setSoonOpen(true)
  }, [])

  return (
    <>
      <SoonModal open={soonOpen} title="REWARD" message="Opening soon." onClose={() => setSoonOpen(false)} />

      <header className="w-full bg-white border-b border-[#eeeeee]">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          {/* Left */}
          <nav className="flex items-center gap-4">
            {items.map((it) => {
              const isTeam = it.href === '/team'
              const isReward = it.href === '/reward'

              if (isReward) {
                return (
                  <a
                    key={it.href}
                    href={it.href}
                    onClick={onClickReward}
                    className={[
                      'text-[13px] font-semibold text-[#1e1e1e] hover:opacity-70',
                      'relative inline-flex items-center', // ✅ badge를 위에 올리려면 relative 필요
                      'cursor-pointer',
                    ].join(' ')}
                  >
                    <span>{it.label}</span>
                    {showRewardBadge ? <NavSoonBadge text={rewardBadgeText} /> : null}
                  </a>
                )
              }

              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    'text-[13px] font-semibold text-[#1e1e1e] hover:opacity-70',
                    isTeam ? 'relative inline-flex items-center' : 'inline-flex items-center',
                  ].join(' ')}
                >
                  <span>{it.label}</span>
                  {isTeam && showTeamBadge ? <NavBetaBadge text={teamBadgeText} /> : null}
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
                    'text-[11px] font-semibold',
                    'px-[7px] py-[3px] rounded-md',
                    'bg-[#F2F7FF] text-[#0B4DD6] border border-[#D6E6FF]',
                  ].join(' ')}
                >
                  <CoinIcon className="w-[15px] h-[15px] text-[#0B4DD6]" />
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
    </>
  )
}
