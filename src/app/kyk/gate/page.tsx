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
    setNeedLogin(false)

    const res = await fetch('/api/kyk/claim', { method: 'POST' })

    // ✅ 무조건 text로 먼저 받기 (서버가 JSON이 아닌 에러를 줘도 원문 확인 가능)
    const text = await res.text().catch(() => '')

    // ✅ text가 JSON이면 파싱, 아니면 null
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }

    // ✅ 성공
    if (res.ok && json?.ok) {
      router.replace('/kyk/result')
      return
    }

    // ✅ 로그인 필요 (세션 없음)
    if (res.status === 401) {
      setNeedLogin(true)
      return
    }

    // ✅ 그 외 에러: 서버가 준 메시지 그대로
    const detail = json?.error ?? text ?? `HTTP ${res.status}`
    setError(detail)
  }

  useEffect(() => {
    ;(async () => {
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

              {/* 디버그용: 다시 시도 버튼 */}
              <button
                type="button"
                onClick={async () => {
                  setLoading(true)
                  await claim()
                  setLoading(false)
                }}
                className="mt-6 rounded-md border px-4 py-2 text-[14px] font-medium"
                style={{ borderColor: BORDER }}
              >
                Retry
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  )
}