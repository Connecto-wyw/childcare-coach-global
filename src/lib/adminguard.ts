import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const ADMIN_DOMAIN = '@connecto-wyw.com'

export async function requireAdmin() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data, error } = await supabase.auth.getSession()
  const email = data.session?.user?.email ?? ''

  const ok = !error && email.endsWith(ADMIN_DOMAIN)

  return {
    ok,
    email,
    supabase,
  }
}
