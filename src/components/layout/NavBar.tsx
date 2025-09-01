// src/components/layout/NavBar.tsx
'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { usePathname } from 'next/navigation'

type Menu = 'home' | 'news' | 'talk'

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '')

export default function NavBar() {
  const user = useUser()
  const supabase = useSupabaseClient()
  const pathname = usePathname()

  const active: Menu = useMemo(() => {
    if (pathname?.startsWith('/team')) return 'talk'
    if (pathname?.startsWith('/news')) return 'news'
    return 'home'
  }, [pathname])

  const loginGoogle = async () => {
    const redirectTo = `${SITE}/auth/callback?next=/coach`
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
        {/* Left: menu */}
        <div className="flex gap-6 text-base font-medium">
          {item('/', 'home', 'HOME')}
          {item('/news', 'news', 'NEWS')}
          {item('/team', 'talk', 'TALK')}
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-gray-300 truncate max-w-[160px]">
                {user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  user.email}
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-gray-600 px-3 py-1.5 hover:bg-gray-800"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={loginGoogle}
              className="rounded-md bg-white px-3 py-1.5 text-black hover:opacity-90"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
