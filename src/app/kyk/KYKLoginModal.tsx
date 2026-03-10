// src/app/kyk/KYKLoginModal.tsx
'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'
import type { Database } from '@/lib/database.types'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

export default function KYKLoginModal({
  open,
  onClose,
  onAfterLogin,
  dict,
}: {
  open: boolean
  onClose: () => void
  onAfterLogin: () => Promise<void>
  dict: any
}) {
  const supabase = createClientComponentClient<Database>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function onGoogle() {
    setError(null)
    setBusy(true)

    try {
      // ✅ 로그인 후 돌아올 위치를 /kyk 로 고정하고
      // ✅ after=login 파라미터를 붙여서 “지금은 로그인 직후다” 상태를 만들자
      const next = encodeURIComponent('/kyk?after=login')
      const redirectTo = `${window.location.origin}/auth/callback?next=${next}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (error) setError(error.message)
      // 성공 시에는 브라우저가 바로 OAuth로 이동하므로 여기서 더 할 일 없음
    } finally {
      setBusy(false)
    }
  }

  // ✅ 사용자가 “이미 로그인 되어 있는 상태”로 모달이 떴다면
  // OK 버튼 누를 때 바로 claim 처리하고 결과로 보냄
  async function onOkIfAlreadyLoggedIn() {
    setError(null)
    setBusy(true)
    try {
      await onAfterLogin()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to continue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-5">
        <div className="text-[16px] font-medium" style={{ color: TEXT }}>
          {dict.title}
        </div>

        <div className="mt-2 text-[13px]" style={{ color: MUTED }}>
          {dict.desc}
        </div>

        {error && (
          <div className="mt-3 text-[12px]" style={{ color: '#d00' }}>
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border px-4 py-2 text-[14px] font-medium"
            style={{ borderColor: BORDER, color: TEXT }}
            disabled={busy}
          >
            {dict.btn_cancel}
          </button>

          <button
            type="button"
            onClick={onGoogle}
            className="flex-1 rounded-md px-4 py-2 text-[14px] font-medium"
            style={{ background: BTN, color: 'white' }}
            disabled={busy}
          >
            {busy ? dict.btn_opening : dict.btn_ok}
          </button>
        </div>

        {/* 이미 로그인된 사용자면: 그냥 계속 진행 버튼도 제공(옵션) */}
        <button
          type="button"
          onClick={onOkIfAlreadyLoggedIn}
          className="mt-3 w-full rounded-md border px-4 py-2 text-[13px] font-medium"
          style={{ borderColor: BORDER, color: TEXT }}
          disabled={busy}
        >
          {dict.btn_continue}
        </button>
      </div>
    </div>
  )
}