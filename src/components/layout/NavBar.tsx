// src/components/layout/NavBar.tsx
'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthUser, useSupabase } from '@/app/providers'

type Menu = 'home' | 'news' | 'team'

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

function getSiteOrigin() {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envSite) return stripTrailingSlash(envSite)
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export default function NavBar() {
  const { user } = useAuthUser()
  const supabase = useSupabase()
  const pathname = usePathname()

  const active: Menu = useMemo(() => {
    if (pathname?.startsWith('/team')) return 'team'
    if (pathname?.startsWith('/news')) return 'news'
    return 'home'
  }, [pathname])

  const loginGoogle = async () => {
    const base = getSiteOrigin()
    const redirectTo = `${base}/auth/callback?next=/coach`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const item = (href: string, key: Menu, label: string) => (
    <Link
      href={href}
      className={[
        'transition',
        'text-[13px]',
        active === key
          ? 'text-[#1e1e1e] font-semibold'
          : 'text-[#b4b4b4] font-medium hover:text-[#1e1e1e]',
      ].join(' ')}
    >
      {label}
    </Link>
  )

  return (
    <nav className="w-full bg-white border-b border-[#eeeeee]">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <div className="flex gap-6">
          {item('/', 'home', 'HOME')}
          {item('/news', 'news', 'NEWS')}
          {item('/team', 'team', 'TEAM')}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="truncate max-w-[180px] text-[15px] font-medium text-[#b4b4b4]">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
              </span>
              <button
                onClick={logout}
                className="px-4 h-8 bg-[#1e1e1e] text-white text-[15px] font-semibold"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={loginGoogle}
              className="px-4 h-8 bg-[#1e1e1e] text-white text-[15px] font-semibold"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
