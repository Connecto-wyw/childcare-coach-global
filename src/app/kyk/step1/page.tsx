// src/app/kyk/step1/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Q1_ADJECTIVES, type KYKAnswers } from '@/lib/kykQuestions'
import {
  ensureDraftStarted,
  loadLocalAnswers,
  saveDraft,
  saveLocalAnswers,
} from '@/lib/kykClient'

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const BTN = '#3497f3'

const EMPTY_ANSWERS: KYKAnswers = {
  q1_adjectives: [],
  likert: {},
}

export default function KYKStep1Page() {
  const router = useRouter()
  const [answers, setAnswers] = useState<KYKAnswers>(() => loadLocalAnswers())

  const selected = answers.q1_adjectives

  useEffect(() => {
    ensureDraftStarted()

    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const restart = params.get('restart')

    if (restart === '1') {
      setAnswers(EMPTY_ANSWERS)
      saveLocalAnswers(EMPTY_ANSWERS)

      params.delete('restart')
      const nextUrl =
        window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
      window.history.replaceState({}, '', nextUrl)
    }
  }, [])

  useEffect(() => {
    saveLocalAnswers(answers)
  }, [answers])

  const countText = useMemo(() => `${selected.length}/5 selected`, [selected.length])

  function toggleAdj(word: string) {
    setAnswers((prev) => {
      const has = prev.q1_adjectives.includes(word)

      if (has) {
        return {
          ...prev,
          q1_adjectives: prev.q1_adjectives.filter((x) => x !== word),
        }
      }

      if (prev.q1_adjectives.length >= 5) return prev

      return {
        ...prev,
        q1_adjectives: [...prev.q1_adjectives, word],
      }
    })
  }

  async function onNext() {
    if (answers.q1_adjectives.length !== 5) return

    await saveDraft(answers)
    router.push('/kyk/step2')
  }

  function onBack() {
    router.push('/kyk')
  }

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-[24px] font-medium leading-tight">KYK</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          아이 성향 분석 (1/3)
        </p>

        <div className="mt-8 border-t" style={{ borderColor: BORDER }} />

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[18px] font-medium leading-snug">
              Q1. 우리 아이를 잘 나타내는 형용사를 5개 선택해주세요.
            </h2>

            <span className="text-[13px]" style={{ color: MUTED }}>
              {countText}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {Q1_ADJECTIVES.map((word) => {
              const active = selected.includes(word)

              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => toggleAdj(word)}
                  className="rounded-full border px-3 py-2 text-[13px] transition"
                  style={{
                    borderColor: active ? BTN : BORDER,
                    background: active ? '#f0f7ff' : 'transparent',
                    color: TEXT,
                  }}
                >
                  {word}
                </button>
              )
            })}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border px-4 py-2 text-[14px] font-medium"
              style={{ borderColor: BORDER, color: TEXT }}
            >
              Back
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={answers.q1_adjectives.length !== 5}
              className="rounded-md px-4 py-2 text-[14px] font-medium"
              style={{
                background: answers.q1_adjectives.length === 5 ? BTN : '#d9d9d9',
                color: 'white',
                cursor: answers.q1_adjectives.length === 5 ? 'pointer' : 'not-allowed',
              }}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}