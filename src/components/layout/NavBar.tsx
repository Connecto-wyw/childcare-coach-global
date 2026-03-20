// src/components/layout/NavBar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'
import { useTranslation } from '@/i18n/I18nProvider'

// ── 유틸 ─────────────────────────────────────────────────────
function format(n: number) {
  try { return n.toLocaleString('en-US') } catch { return String(n) }
}
function stripTrailingSlash(s: string) { return s.replace(/\/$/, '') }
function getSiteOrigin() {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envSite) return stripTrailingSlash(envSite)
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
function safeText(v: unknown) { return String(v ?? '').trim() }

// ── 아이콘 ───────────────────────────────────────────────────
function IconHome({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  )
}

function IconMarket({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M19 6H17.5A5.5 5.5 0 007 6H5.5A2.5 2.5 0 003 8.5v11A2.5 2.5 0 005.5 22h13a2.5 2.5 0 002.5-2.5v-11A2.5 2.5 0 0019 6zm-7-3a3.5 3.5 0 013.44 3H8.56A3.5 3.5 0 0112 3zm7 16.5a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5H7v1.5a1 1 0 002 0V8h6v1.5a1 1 0 002 0V8h1.5a.5.5 0 01.5.5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function IconTeam({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconKyk({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1zM10 18h4v1c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-1z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8A6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
    </svg>
  )
}

function IconAbout({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2.5" />
    </svg>
  )
}

function CoinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4Zm0 2c4.42 0 7 .98 7 2s-2.58 2-7 2-7-.98-7-2 2.58-2 7-2Zm0 14c-4.42 0-7-.98-7-2v-2.1C6.58 16.02 9.1 16.5 12 16.5s5.42-.48 7-1.6V17c0 1.02-2.58 2-7 2Zm0-4.5c-4.42 0-7-.98-7-2v-2.1C6.58 11.52 9.1 12 12 12s5.42-.48 7-1.6V12.5c0 1.02-2.58 2-7 2Z" fill="currentColor" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── 데이터 ───────────────────────────────────────────────────
type NavItem = { key: string; href: string }

const NAV_ITEMS: NavItem[] = [
  { key: 'coach',  href: '/coach' },
  { key: 'team',   href: '/team' },
  { key: 'teams',  href: '/teams' },
  { key: 'kyk',    href: '/kyk' },
  { key: 'about',  href: '/about' },
]

const ICON_MAP = [IconHome, IconMarket, IconTeam, IconKyk, IconAbout]

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function NavBar() {
  const supabase   = useSupabase()
  const { user, loading: authLoading } = useAuthUser()
  const t          = useTranslation('navbar')
  const pathname   = usePathname()

  const [nickname, setNickname]         = useState('')
  const [points, setPoints]             = useState(0)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [menuOpen, setMenuOpen]         = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  function isActive(href: string) {
    if (href === '/coach') return pathname === '/coach' || pathname === '/'
    if (href === '/team')  return pathname === '/team' || (pathname.startsWith('/team/') && !pathname.startsWith('/teams'))
    return pathname === href || pathname.startsWith(href + '/')
  }

  useEffect(() => {
    if (!user) { setNickname(''); setPoints(0); setLoadingPoints(false); setMenuOpen(false) }
  }, [user])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuOpen) return
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const googleName = useMemo(() => {
    if (!user) return ''
    const meta: any = user.user_metadata ?? {}
    return safeText(meta.full_name) || safeText(meta.name) || safeText(meta.email) || safeText(user.email)
  }, [user])
  const displayName = useMemo(() => safeText(googleName) || safeText(nickname), [googleName, nickname])

  const loadProfileNickname = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()
    setNickname(safeText((data as any)?.nickname))
  }, [supabase, user])

  const loadPoints = useCallback(async () => {
    if (!user) return
    setLoadingPoints(true)
    const { data } = await supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
    setLoadingPoints(false)
    setPoints(Number((data as any)?.points ?? 0))
  }, [supabase, user])

  useEffect(() => {
    if (!user) return
    void loadProfileNickname()
    void loadPoints()
  }, [user?.id, loadProfileNickname, loadPoints])

  useEffect(() => {
    const handler = () => { if (user) void loadPoints() }
    window.addEventListener('points:refresh', handler)
    return () => window.removeEventListener('points:refresh', handler)
  }, [user, loadPoints])

  // 하단 탭바 높이를 CSS 변수로 노출 (ChatBox 입력창 위치 계산용)
  useEffect(() => {
    const el = document.getElementById('bottom-tab-nav')
    if (!el) return
    const update = () => {
      const h = window.innerWidth < 768 ? Math.ceil(el.getBoundingClientRect().height) : 0
      document.documentElement.style.setProperty('--bottom-nav-h', `${h}px`)
    }
    update()
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { window.removeEventListener('resize', update); ro.disconnect() }
  }, [])

  const loginGoogle = useCallback(async () => {
    const base = getSiteOrigin()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/auth/callback?next=/coach` },
    })
  }, [supabase])

  const signOut = useCallback(async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
    try { window.location.href = '/coach' } catch {}
  }, [supabase])

  const avatarUrl: string | null = useMemo(() => {
    if (!user) return null
    const meta: any = user.user_metadata ?? {}
    return meta.avatar_url || meta.picture || null
  }, [user])

  // ── 유저 영역 (공통) ────────────────────────────────────────
  function UserSection({ compact = false }: { compact?: boolean }) {
    if (authLoading) return <span className="text-[12px] text-[#b4b4b4]">{t('loading')}</span>
    if (!user) {
      return (
        <button
          onClick={loginGoogle}
          className={[
            'rounded-lg bg-[#1e1e1e] text-white font-semibold whitespace-nowrap',
            compact ? 'h-8 px-3 text-[11px]' : 'h-8 px-3 text-[12px]',
          ].join(' ')}
        >
          Sign in with Google
        </button>
      )
    }
    return (
      <div className="flex items-center gap-2 min-w-0">
        {/* 포인트 */}
        <span className="hidden sm:flex items-center gap-1 px-[7px] py-[3px] rounded-md bg-[#F2F7FF] text-[#0B4DD6] border border-[#D6E6FF] text-[11px] font-semibold whitespace-nowrap">
          <CoinIcon className="w-[14px] h-[14px] text-[#0B4DD6]" />
          <span>{t('points')}</span>
          <span>{loadingPoints ? '…' : format(points)}</span>
        </span>
        {/* 유저 메뉴 */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 hover:opacity-80"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e9e9e9] flex items-center justify-center">
                <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#8a8a8a]" fill="currentColor">
                  <circle cx="8" cy="5" r="3" />
                  <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                </svg>
              </div>
            )}
            {!compact && (
              <>
                <span className="hidden md:block text-[12px] font-semibold text-[#1e1e1e] max-w-[120px] truncate">{displayName || t('account')}</span>
                <ChevronDownIcon />
              </>
            )}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-md border border-[#e5e5e5] bg-white shadow-sm overflow-hidden z-50">
              {compact && (
                <div className="px-3 py-2 border-b border-[#f0f0f0]">
                  <p className="text-[12px] font-semibold text-[#0e0e0e] truncate">{displayName}</p>
                  <p className="text-[11px] text-[#8a8a8a] flex items-center gap-1 mt-0.5">
                    <CoinIcon className="w-3 h-3" />
                    {loadingPoints ? '…' : format(points)} {t('points')}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={signOut}
                className="w-full text-left px-3 py-2 text-[12px] text-[#1e1e1e] hover:bg-[#f5f5f5]"
              >
                {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── PC: 상단 가로 네비게이션 ─────────────────────────── */}
      <header className="hidden md:block w-full bg-white border-b border-[#eeeeee] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-5">
            {NAV_ITEMS.map((item, i) => {
              const active = isActive(item.href)
              const isMarket = item.href === '/team'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'text-[13px] font-semibold transition-colors',
                    isMarket ? 'relative' : '',
                    active ? 'text-[#3497f3]' : 'text-[#1e1e1e] hover:text-[#3497f3]',
                  ].join(' ')}
                >
                  {t(item.key)}
                  {isMarket && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#9F1D23] text-white text-[9px] font-extrabold leading-none whitespace-nowrap animate-pulse">
                      EVENT
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <UserSection />
        </div>
      </header>

      {/* ── 모바일: 상단 미니 헤더 ──────────────────────────── */}
      <header className="md:hidden w-full bg-white border-b border-[#eeeeee] sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/coach" className="text-[15px] font-bold text-[#0e0e0e]">
            AI Parenting Coach
          </Link>
          <UserSection compact />
        </div>
      </header>

      {/* ── 모바일: 하단 탭 바 ──────────────────────────────── */}
      <nav
        id="bottom-tab-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#eeeeee] z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {NAV_ITEMS.map((item, i) => {
            const active = isActive(item.href)
            const Icon = ICON_MAP[i]
            const isMarket = item.href === '/team'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors',
                  active ? 'text-[#3497f3]' : 'text-[#8a8a8a]',
                ].join(' ')}
              >
                {isMarket && (
                  <span className="absolute top-1 left-1/2 translate-x-1 w-1.5 h-1.5 rounded-full bg-[#9F1D23]" />
                )}
                <Icon active={active} />
                <span className="text-[10px] font-medium leading-none">{t(item.key)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
