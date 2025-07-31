'use client'

import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useState, useEffect } from 'react'
import { Session } from '@supabase/auth-helpers-react'

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session?: Session
}) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

  useEffect(() => {
    // onAuthStateChange는 { data: { subscription } } 형태로 반환하므로 이렇게 구조분해 할당
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(() => {
      supabaseClient.auth.getSession() // 로그인 상태 변경 시 세션 갱신 시도
    })

    // 컴포넌트 언마운트 시 구독 해제
    return () => subscription?.unsubscribe()
  }, [supabaseClient])

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={session}>
      {children}
    </SessionContextProvider>
  )
}