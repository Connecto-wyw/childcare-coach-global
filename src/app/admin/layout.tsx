import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdminAuth } from '@/lib/auth/isAdmin'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata: Metadata = {
  title: 'AI 육아코치 - Admin',
  description: '관리자 페이지',
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = await requireAdminAuth()

  if (!auth.ok) {
    if (auth.status === 401) {
      redirect('/')
    }
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#222222] border border-red-900 rounded-lg p-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">403 Forbidden</h1>
          <p className="text-gray-300">{auth.detail}</p>
        </div>
      </main>
    )
  }

  const user = auth.user

  return (
    <div className="flex min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <AdminSidebar userEmail={user.email} />
      <div className="flex-1 overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}
