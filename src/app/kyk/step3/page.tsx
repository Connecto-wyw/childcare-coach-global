'use client'

import { useEffect, useMemo, useState } from 'react'
import { LIKERT_OPTIONS, Q2_TO_Q13, type KYKAnswers, type LikertValue } from '@/lib/kykQuestions'
import { ensureDraftStarted, loadLocalAnswers, saveDraft, saveLocalAnswers } from '@/lib/kykClient'
import { useRouter } from 'next/navigation'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

export default function KYKStep3Page() {
  const router = useRouter()
  const [answers, setAnswers] = useState<KYKAnswers>(() => loadLocalAnswers())

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
    await saveDraft(answers)
    router.push('/kyk/gate')
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
    </main>
  )
}