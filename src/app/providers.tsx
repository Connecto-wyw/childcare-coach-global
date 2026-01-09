'use client'

import { useState } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function Providers({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createClientComponentClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  )
}
