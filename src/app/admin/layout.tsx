import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/database.types'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata: Metadata = {
  title: 'AI 육아코치 - Admin',
  description: '관리자 페이지',
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user

  if (!user) {
    redirect('/')
  }

  // 1. Check ADMIN_EMAILS environment variable
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isEmailAdmin = user.email && adminEmails.includes(user.email.toLowerCase())

  // 2. Check profiles.is_admin flag in Database
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  const isProfileAdmin = profile?.is_admin === true

  if (!isEmailAdmin && !isProfileAdmin) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#222222] border border-red-900 rounded-lg p-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">403 Forbidden</h1>
          <p className="text-gray-300">You do not have administrative access to view this section.</p>
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <AdminSidebar userEmail={user.email} />
      <div className="flex-1 overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}
