// src/lib/adminguard.ts
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const ADMIN_DOMAIN = '@connecto-wyw.com'

// ✅ 이게 핵심: SupabaseClient를 직접 쓰지 말고, factory의 ReturnType으로 고정
type SupabaseServerClient = ReturnType<typeof createServerComponentClient<Database>>

export async function requireAdmin(): Promise<{
  ok: boolean
  email: string
  supabase: SupabaseServerClient
}> {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data, error } = await supabase.auth.getSession()
  const email = data.session?.user?.email ?? ''
  const ok = !error && email.endsWith(ADMIN_DOMAIN)

  return { ok, email, supabase }
}

