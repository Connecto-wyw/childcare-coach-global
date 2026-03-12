'use client'

import { useEffect, useMemo, useState } from 'react'
import { LIKERT_OPTIONS, Q2_TO_Q13, type KYKAnswers, type LikertValue } from '@/lib/kykQuestions'
import { ensureDraftStarted, loadLocalAnswers, saveDraft, saveLocalAnswers } from '@/lib/kykClient'
import { useRouter } from 'next/navigation'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

export default function Step2Client({ dict }: { dict: any }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<KYKAnswers>({ q1_adjectives: [], likert: {} })
  const [mounted, setMounted] = useState(false)

  const questions = useMemo(() => Q2_TO_Q13.slice(0, 6), []) // q2~q7
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

  async function onNext() {
    if (!isComplete) return
    await saveDraft(answers)
    router.push('/kyk/step3')
  }

  function onBack() {
    router.push('/kyk')
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

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border px-4 py-2 text-[14px] font-medium"
              style={{ borderColor: BORDER }}
            >
              {dict.btn_back}
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!isComplete}
              className="rounded-md px-4 py-2 text-[14px] font-medium"
              style={{
                background: isComplete ? BTN : '#d9d9d9',
                color: 'white',
                cursor: isComplete ? 'pointer' : 'not-allowed',
              }}
            >
              {dict.btn_next}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
