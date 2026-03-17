// src/app/kyk/step3/Step3Client.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LIKERT_OPTIONS,
  Q2_TO_Q13,
  type KYKAnswers,
  type LikertValue,
} from '@/lib/kykQuestions'
import { ensureDraftStarted, loadLocalAnswers, saveDraft, saveLocalAnswers } from '@/lib/kykClient'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

function Modal({
  open,
  title,
  body,
  onCancel,
  onOk,
  okText = 'OK',
  cancelText = 'Cancel',
}: {
  open: boolean
  title: string
  body: string
  onCancel: () => void
  onOk: () => void
  okText?: string
  cancelText?: string
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[92%] max-w-md rounded-lg bg-white p-5">
        <div className="text-[16px] font-semibold" style={{ color: TEXT }}>
          {title}
        </div>

        <div className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>
          {body}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-[14px] font-medium transition active:scale-95"
            style={{ borderColor: BORDER }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onOk}
            className="rounded-md px-4 py-2 text-[14px] font-medium transition active:scale-95 hover:brightness-95"
            style={{ background: BTN, color: 'white' }}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Step3Client({ dict }: { dict: any }) {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient<Database>(), [])

  const [answers, setAnswers] = useState<KYKAnswers>({ q1_adjectives: [], likert: {} })
  const [mounted, setMounted] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginErr, setLoginErr] = useState<string | null>(null)
  const [claimErr, setClaimErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const questions = useMemo(() => Q2_TO_Q13.slice(6, 12), [])
  const isComplete = useMemo(
    () => questions.every((q) => !!answers.likert[q.key as keyof typeof answers.likert]),
    [answers.likert, questions]
  )

  useEffect(() => {
    ensureDraftStarted()
    setAnswers(loadLocalAnswers())
    setMounted(true)
  }, [])

  useEffect(() => {
    saveLocalAnswers(answers)
  }, [answers])

  function setLikert(key: string, value: LikertValue) {
    setAnswers((prev) => ({
      ...prev,
      likert: { ...prev.likert, [key]: value },
    }))
  }

  async function claimAndGoResult(forceDraftId?: string) {
    setClaimErr(null)

    const bodyObj = forceDraftId ? { draft_id: forceDraftId } : undefined
    const res = await fetch('/api/kyk/claim', { 
      method: 'POST',
      headers: forceDraftId ? { 'Content-Type': 'application/json' } : undefined,
      body: bodyObj ? JSON.stringify(bodyObj) : undefined
    })
    const json = await res.json().catch(() => ({}))

    if (res.ok && json?.ok) {
      router.replace('/kyk/result')
      return
    }

    if (res.status === 401) {
      setShowLoginModal(true)
      return
    }

    setClaimErr(json?.error ?? `HTTP ${res.status}`)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const after = params.get('after')
    if (after !== 'login') return

    ;(async () => {
      setBusy(true)
      try {
        // ✅ 1) Ensure the draft cookie is alive and extract draft ID directly.
        const startRes = await fetch('/api/kyk/start', { method: 'POST' })
        const startJson = await startRes.json().catch(() => ({}))
        const forcedDraftId = startJson.draft_id
        
        // ✅ 2) Save current local answers to the newly forced server draft
        await fetch('/api/kyk/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, draft_id: forcedDraftId }),
        })
        
        // ✅ 3) Generate the final result and migrate to /kyk/result
        await claimAndGoResult(forcedDraftId)
      } finally {
        setBusy(false)
        params.delete('after')
        const nextUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
        window.history.replaceState({}, '', nextUrl)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSeeResult() {
    if (!isComplete) return

    setBusy(true)
    setLoginErr(null)
    setClaimErr(null)

    try {
      await saveDraft(answers)
      await claimAndGoResult()
    } catch (e: any) {
      setClaimErr(e?.message ?? 'Failed to continue.')
    } finally {
      setBusy(false)
    }
  }

  async function startGoogleLogin() {
    setLoginErr(null)
    setShowLoginModal(false)

    document.cookie = 'kyk_auth_return=/kyk/step3?after=login; path=/; max-age=300; SameSite=Lax'
    const callbackUrl = new URL(`/auth/callback`, window.location.origin)
    callbackUrl.searchParams.set('next', '/kyk/step3?after=login')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      setLoginErr(error.message)
    }
  }

  function onBack() {
    router.push('/kyk/step2')
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">{dict.title}</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          {dict.step_indicator}
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-8 space-y-8">
          {questions.map((q) => {
            const picked = answers.likert[q.key as keyof typeof answers.likert]
            const text = dict.questions?.[q.key] || q.key

            return (
              <div key={q.key}>
                <div className="text-[16px] font-medium leading-snug">{text}</div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LIKERT_OPTIONS.map((opt) => {
                    const active = picked === opt.value
                    const label = dict.likert?.[String(opt.value)] || String(opt.value)

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLikert(q.key, opt.value as LikertValue)}
                        className="rounded-md border px-3 py-2 text-[13px]"
                        style={{
                          borderColor: active ? BTN : BORDER,
                          background: active ? '#f0f7ff' : 'transparent',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {(loginErr || claimErr) && (
            <p className="text-[13px]" style={{ color: '#d00' }}>
              {loginErr ?? claimErr}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border px-4 py-2 text-[14px] font-medium transition active:scale-95"
              style={{ borderColor: BORDER }}
              disabled={busy}
            >
              {dict.btn_back}
            </button>

            <button
              type="button"
              onClick={onSeeResult}
              disabled={!isComplete || busy}
              className="rounded-md px-4 py-2 text-[14px] font-medium transition disabled:bg-[#d9d9d9] active:scale-95 hover:brightness-95"
              style={{
                background: isComplete && !busy ? BTN : '#d9d9d9',
                color: 'white',
                cursor: isComplete && !busy ? 'pointer' : 'not-allowed',
              }}
            >
              {busy ? dict.loading : dict.btn_see_result}
            </button>
          </div>
        </section>
      </div>

      <Modal
        open={showLoginModal}
        title={dict.modal_title}
        body={dict.modal_body}
        onCancel={() => setShowLoginModal(false)}
        onOk={startGoogleLogin}
        okText={dict.modal_ok}
        cancelText={dict.modal_cancel}
      />
    </main>
  )
}