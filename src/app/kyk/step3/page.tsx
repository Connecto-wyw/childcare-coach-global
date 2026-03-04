'use client'

import { useEffect, useMemo, useState } from 'react'
import { LIKERT_OPTIONS, Q2_TO_Q13, type KYKAnswers, type LikertValue } from '@/lib/kykQuestions'
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
            className="rounded-md border px-4 py-2 text-[14px] font-medium"
            style={{ borderColor: BORDER }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onOk}
            className="rounded-md px-4 py-2 text-[14px] font-medium"
            style={{ background: BTN, color: 'white' }}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KYKStep3Page() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [answers, setAnswers] = useState<KYKAnswers>(() => loadLocalAnswers())
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginErr, setLoginErr] = useState<string | null>(null)

  const questions = useMemo(() => Q2_TO_Q13.slice(6, 12), []) // q8~q13
  const isComplete = useMemo(
    () => questions.every((q) => !!answers.likert[q.key]),
    [answers.likert, questions]
  )

  useEffect(() => {
    ensureDraftStarted()
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

  async function onSeeResult() {
    if (!isComplete) return

    // 1) 일단 draft 저장
    await saveDraft(answers)

    // 2) 서버에게 "지금 claim 가능?" 먼저 물어본다.
    //    (로그인 되어있으면 바로 claim 성공 -> result)
    const res = await fetch('/api/kyk/claim', { method: 'POST' })
    const json = await res.json().catch(() => ({}))

    if (res.ok && json?.ok) {
      router.replace('/kyk/result')
      return
    }

    // 로그인 필요면 모달 띄우기
    if (res.status === 401) {
      setShowLoginModal(true)
      return
    }

    // 그 외는 gate로 보내서 상태 보여주기(디버그/예외처리)
    router.push('/kyk/gate')
  }

  async function startGoogleLogin() {
    setLoginErr(null)
    setShowLoginModal(false)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/kyk/gate`,
      },
    })

    if (error) setLoginErr(error.message)
  }

  function onBack() {
    router.push('/kyk/step2')
  }

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          아이 성향 분석 (3/3)
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-8 space-y-8">
          {questions.map((q) => {
            const picked = answers.likert[q.key]
            return (
              <div key={q.key}>
                <div className="text-[16px] font-medium leading-snug">{q.text}</div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LIKERT_OPTIONS.map((opt) => {
                    const active = picked === opt.value
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
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {loginErr && (
            <p className="text-[13px]" style={{ color: '#d00' }}>
              {loginErr}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border px-4 py-2 text-[14px] font-medium"
              style={{ borderColor: BORDER }}
            >
              Back
            </button>

            <button
              type="button"
              onClick={onSeeResult}
              disabled={!isComplete}
              className="rounded-md px-4 py-2 text-[14px] font-medium"
              style={{
                background: isComplete ? BTN : '#d9d9d9',
                color: 'white',
                cursor: isComplete ? 'pointer' : 'not-allowed',
              }}
            >
              See Result
            </button>
          </div>
        </section>
      </div>

      <Modal
        open={showLoginModal}
        title="Google login required"
        body="결과를 저장하고 보여주려면 구글 로그인이 필요해요. OK를 누르면 계정 선택창으로 이동합니다."
        onCancel={() => setShowLoginModal(false)}
        onOk={startGoogleLogin}
        okText="OK"
        cancelText="Cancel"
      />
    </main>
  )
}