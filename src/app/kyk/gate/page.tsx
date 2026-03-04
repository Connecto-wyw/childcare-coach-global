// src/app/kyk/gate/page.tsx
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
  const [busyLogin, setBusyLogin] = useState(false)

  async function claim() {
    setError(null)

    const res = await fetch('/api/kyk/claim', { method: 'POST' })
    const json = await res.json().catch(() => ({}))

    if (res.ok && json?.ok) {
      router.replace('/kyk/result')
      return
    }

    if (res.status === 401) {
      setNeedLogin(true) // ✅ 모달 띄우기
      return
    }

    const detail = json?.error ?? `HTTP ${res.status}`
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
    try {
      setBusyLogin(true)
      setError(null)

      const next = encodeURIComponent('/kyk/gate') // ✅ 중요: URL 인코딩
      const redirectTo = `${window.location.origin}/auth/callback?next=${next}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (error) setError(error.message)
    } finally {
      setBusyLogin(false)
    }
  }

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          결과를 불러오는 중이에요.
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        {/* 로딩/에러만 최소 표시 */}
        <section className="mt-10">
          {loading ? (
            <p className="text-[14px]" style={{ color: MUTED }}>
              Loading...
            </p>
          ) : error ? (
            <p className="text-[13px]" style={{ color: '#d00' }}>
              {error}
            </p>
          ) : null}
        </section>
      </div>

      {/* ✅ 로그인 필요 모달 */}
      {needLogin && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-5">
            <div className="text-[16px] font-medium" style={{ color: TEXT }}>
              구글 로그인이 필요해요
            </div>
            <div className="mt-2 text-[13px]" style={{ color: MUTED }}>
              KYK 결과를 계정에 저장하고, 다음 로그인 때 코치가 이 성향을 반영해서 답해요.
            </div>

            {error && (
              <div className="mt-3 text-[12px]" style={{ color: '#d00' }}>
                {error}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => router.replace('/kyk')}
                className="flex-1 rounded-md border px-4 py-2 text-[14px] font-medium"
                style={{ borderColor: BORDER, color: TEXT }}
                disabled={busyLogin}
              >
                Back
              </button>

              <button
                type="button"
                onClick={onGoogleLogin}
                className="flex-1 rounded-md px-4 py-2 text-[14px] font-medium"
                style={{ background: BTN, color: 'white' }}
                disabled={busyLogin}
              >
                {busyLogin ? 'Opening...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}