// src/lib/adminguard.ts
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type RequireAdminResult = {
  ok: boolean
  supabase: SupabaseClient<Database>
  userId: string | null
}

export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase =
    createServerComponentClient<Database>({ cookies }) as unknown as SupabaseClient<Database>

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) {
    return { ok: false, supabase, userId: null }
  }

  const userId = auth.user.id

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (profileError) {
    return { ok: false, supabase, userId }
  }

  return { ok: Boolean(profile?.is_admin), supabase, userId }
}
