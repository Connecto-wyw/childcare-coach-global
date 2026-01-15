import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const ADMIN_DOMAIN = '@connecto-wyw.com'

export async function requireAdmin() {
  // ✅ Database 제네릭 고정 (이게 핵심)
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data, error } = await supabase.auth.getSession()
  const email = data.session?.user?.email ?? ''
  const ok = !error && email.endsWith(ADMIN_DOMAIN)

  return { ok, email, supabase }
}
