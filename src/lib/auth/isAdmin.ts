import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export type AdminAuthResult =
  | { ok: true; user: any }
  | { ok: false; status: 401; error: string; detail: string }
  | { ok: false; status: 403; error: string; detail: string }

export async function requireAdminAuth(): Promise<AdminAuthResult> {
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

  // 1. Verify Authentication
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) {
    return {
      ok: false,
      status: 401,
      error: 'not_authenticated',
      detail: authError?.message || 'No user session found.',
    }
  }

  const user = authData.user

  // 2. Check ADMIN_EMAILS environment variable
  const rawAdminEmails = process.env.ADMIN_EMAILS || ''
  const adminEmails = rawAdminEmails
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return { ok: true, user }
  }

  // 3. Fallback to Database Query: profiles.is_admin
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr) {
    console.error('[requireAdminAuth] Error fetching profile:', profileErr)
  }

  if (profile?.is_admin === true) {
    return { ok: true, user }
  }

  // 4. Deny Access (403 Forbidden)
  return {
    ok: false,
    status: 403,
    error: 'forbidden_admin_required',
    detail: 'Administrative privileges are required to access this resource.',
  }
}
