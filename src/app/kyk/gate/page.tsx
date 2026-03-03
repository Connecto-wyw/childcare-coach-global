'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

export default function KYKGatePage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function tryClaim() {
    setError(null)
    const res = await fetch('/api/kyk/claim', { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.ok) {
      setError(json?.error ?? 'claim failed')
      return
    }
    router.replace('/kyk/result')
  }

  useEffect(() => {
    ;(async () => {
      // 로그인 여부 확인
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        // 로그인 되어 있으면 claim 시도
        await tryClaim()
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onGoogleLogin() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 로그인 후 다시 gate로 돌아오게
        redirectTo: `${window.location.origin}/kyk/gate`,
      },
    })
    if (error) setError(error.message)
  }

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          결과를 보기 전에 구글 로그인이 필요해요.
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-10">
          {loading ? (
            <p className="text-[14px]" style={{ color: MUTED }}>
              Checking login...
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={onGoogleLogin}
                className="rounded-md px-4 py-2 text-[14px] font-medium"
                style={{ background: BTN, color: 'white' }}
              >
                Continue with Google
              </button>

              {error && (
                <p className="mt-4 text-[13px]" style={{ color: '#d00' }}>
                  {error}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}