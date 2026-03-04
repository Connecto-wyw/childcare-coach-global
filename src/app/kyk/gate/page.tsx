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
  const [needLogin, setNeedLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function claim() {
    setError(null)
    const res = await fetch('/api/kyk/claim', { method: 'POST' })
    const json = await res.json().catch(() => ({}))

    if (res.ok && json?.ok) {
      router.replace('/kyk/result')
      return
    }

    // 로그인 안 된 경우(혹은 세션 쿠키 없음)
    if (res.status === 401) {
      setNeedLogin(true)
      return
    }

    setError(json?.error ?? 'claim failed')
  }

  useEffect(() => {
    ;(async () => {
      // ✅ 클라에서 getUser()로 판단하지 말고,
      // ✅ 서버(쿠키 기반)에게 claim을 먼저 시킨다.
      await claim()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onGoogleLogin() {
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // ✅ 로그인 완료 후 auth/callback에서 next=/kyk/gate로 복귀
        redirectTo: `${window.location.origin}/auth/callback?next=/kyk/gate`,
      },
    })

    if (error) setError(error.message)
  }

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          결과를 불러오는 중이에요.
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-10">
          {loading ? (
            <p className="text-[14px]" style={{ color: MUTED }}>
              Loading...
            </p>
          ) : needLogin ? (
            <>
              <p className="text-[14px]" style={{ color: MUTED }}>
                결과를 보기 전에 구글 로그인이 필요해요.
              </p>

              <button
                type="button"
                onClick={onGoogleLogin}
                className="mt-6 rounded-md px-4 py-2 text-[14px] font-medium"
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
          ) : (
            <>
              <p className="text-[14px]" style={{ color: MUTED }}>
                결과를 가져오지 못했어요.
              </p>
              {error && (
                <p className="mt-2 text-[13px]" style={{ color: '#d00' }}>
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