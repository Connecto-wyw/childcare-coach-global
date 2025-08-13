'use client'

import { useState } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Session } from '@supabase/supabase-js'

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session?: Session
}) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())
  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={session}>
      {children}
    </SessionContextProvider>
  )
}
