import Link from 'next/link'

export default function AdminDashboardPage() {
  const adminModules = [
    {
      title: 'Popular Keywords',
      description: 'Manage trending and popular search keywords.',
      href: '/admin/keywords',
      color: 'bg-blue-600',
    },
    {
      title: 'KYK Keywords',
      description: 'Configure the Know Your Kid personality profile keywords by MBTI.',
      href: '/admin/kyk-keywords',
      color: 'bg-purple-600',
    },
    {
      title: 'News Posts',
      description: 'Create and edit news articles or announcements.',
      href: '/admin/news',
      color: 'bg-emerald-600',
    },
    {
      title: 'Teams Management',
      description: 'Create, edit, and organize Teams across the platform.',
      href: '/admin/team',
      color: 'bg-amber-600',
    },
    {
      title: 'Team Items',
      description: 'Manage specific items, pricing, and content within Teams.',
      href: '/admin/team-items',
      color: 'bg-rose-600',
    },
  ]

  return (
    <main className="min-h-screen p-8 bg-[#333333] text-[#eae3de]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Welcome to the Admin Console</h1>
        <p className="text-gray-400 mb-10">Select a module below or use the sidebar to manage the platform settings, users, and content.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="group block p-6 bg-[#222222] border border-[#444444] rounded-xl hover:border-gray-300 transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${mod.color}`} />
                <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">{mod.title}</h2>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{mod.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
