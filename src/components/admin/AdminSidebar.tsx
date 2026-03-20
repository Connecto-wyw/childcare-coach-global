// src/components/admin/AdminSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()

  const links = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Popular Keywords', href: '/admin/keywords' },
    { label: 'KYK Keywords', href: '/admin/kyk-keywords' },
    { label: 'News Posts', href: '/admin/news' },
    { label: 'Teams', href: '/admin/team' },
    { label: 'Team Items', href: '/admin/team-items' },
    { label: 'Programs', href: '/admin/programs' },
  ]

  return (
    <aside className="w-64 bg-[#222222] border-r border-[#444444] shrink-0 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[#444444]">
        <h2 className="text-xl font-bold text-white tracking-tight">Admin Console</h2>
        {userEmail && <p className="text-xs text-gray-400 mt-1 truncate">{userEmail}</p>}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {links.map((link) => {
          // Dashboard exact match vs child routes prefix match
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'block px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#9F1D23] text-white shadow-sm'
                  : 'text-gray-300 hover:bg-[#333333] hover:text-white',
              ].join(' ')}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#444444]">
        <Link
          href="/"
          className="block w-full text-center px-4 py-2 bg-transparent border border-gray-600 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          ← Back to Site
        </Link>
      </div>
    </aside>
  )
}
