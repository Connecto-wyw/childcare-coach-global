'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Logo from '@/components/Logo'
import { v4 as uuidv4 } from 'uuid'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'

type Option = {
  id: number
  label: string
  image_url?: string
}

type Question = {
  id: number
  question: string
  type: string
  order: number
  question_format: 'multiple_choice' | 'scale' | 'text' | 'image_choice'
  options?: Option[]
}

export default function SurveyPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentIndex, setCurrentIndex] = useState<number>(-1)

  const router = useRouter()
  const supabaseClient = useSupabaseClient()
  const user = useUser()

  useEffect(() => {
    const fetchData = async () => {
      const { data: qData, error: qError } = await supabase
        .from('survey_questions')
        .select('*, survey_options(*)')
        .order('order', { ascending: true })

      if (qError) {
        console.error('질문 불러오기 에러:', qError)
        return
      }

      const formatted = qData.map((q: any) => ({
        ...q,
        options: q.survey_options
          ? q.survey_options.filter(
              (opt: Option, index: number, self: Option[]) =>
                index === self.findIndex(o => o.label === opt.label)
            )
          : [],
      }))

      setQuestions(formatted)
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (user && currentIndex === -1) {
      setCurrentIndex(0) // 로그인 후 자동으로 설문 시작
    }
  }, [user, currentIndex])

  const handleAnswer = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1)
  }

  const handleSubmitSurvey = async () => {
    let userId = user?.id || localStorage.getItem('user_id')
    if (!userId) {
      userId = uuidv4()
      localStorage.setItem('user_id', userId)
    }

    const { error: userInsertError } = await supabase
      .from('users')
      .upsert(
        [
          {
            id: userId,
            email: user?.email || null,
            provider: user ? 'google' : null,
            user_agent: navigator.userAgent ?? null,
          },
        ],
        { onConflict: 'id' }
      )

    if (userInsertError) {
      console.error('🛑 유저 upsert 실패:', userInsertError.message)
    }

    const answerPayload = Object.entries(answers).map(([qId, value]) => ({
      user_id: userId,
      question_id: parseInt(qId),
      answer: value,
    }))

    const { error } = await supabase.from('survey_answers').insert(answerPayload)
    if (error) {
      console.error('❌ 설문 저장 실패:', error.message)
      alert('설문 저장 중 오류가 발생했어요.')
      return
    }

    router.push('/coach')
  }

  const handleStart = async () => {
    if (!user) {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/survey`,
        },
      })
      if (error) console.error('구글 로그인 에러:', error.message)
    } else {
      handleNext()
    }
  }

  const currentQuestion = questions[currentIndex]

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans flex items-center justify-center">
      <div className="max-w-xl w-full p-6">
        {/* 표지 화면 */}
        {currentIndex === -1 && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Logo />
            </div>
            <h1 className="text-3xl font-bold">육아를 쉽게, AI 육아코치</h1>
            <p className="text-l">
              나와 내 아이에게 딱 맞는 코칭을 위해<br />
              간단한 설문을 진행 후 고민을 해결해드릴게요.
            </p>
            <button
              onClick={handleStart}
              className="mt-6 px-6 py-3 bg-[#8a1a1d] rounded text-white hover:opacity-90"
            >
              구글로 로그인 후 시작하기
            </button>
          </div>
        )}

        {/* 질문 화면 */}
        {currentIndex >= 0 && currentIndex < questions.length && currentQuestion && (
          <div>
            <p className="text-lg font-semibold mb-4">
              Q{currentIndex + 1}. {currentQuestion.question}
            </p>

            {currentQuestion.question_format === 'multiple_choice' &&
              currentQuestion.options?.map(opt => (
                <button
                  key={opt.id}
                  className={`block w-full text-left p-3 mb-2 rounded border ${
                    answers[currentQuestion.id] === opt.label ? 'bg-blue-100 text-black' : ''
                  }`}
                  onClick={() => handleAnswer(currentQuestion.id, opt.label)}
                >
                  {opt.label}
                </button>
              ))}

            {currentQuestion.question_format === 'scale' && (
              <div className="flex justify-between gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <label key={n} className="flex flex-col items-center text-sm">
                    <input
                      type="radio"
                      name={`scale-${currentQuestion.id}`}
                      checked={answers[currentQuestion.id] === String(n)}
                      onChange={() => handleAnswer(currentQuestion.id, String(n))}
                    />
                    {n}
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.question_format === 'text' && (
              <textarea
                className="w-full p-3 rounded border text-black"
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                placeholder="답변을 입력하세요"
              />
            )}

            {currentQuestion.question_format === 'image_choice' && (
              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options?.map(opt => (
                  <div
                    key={opt.id}
                    className={`border rounded p-2 cursor-pointer text-center ${
                      answers[currentQuestion.id] === opt.label ? 'bg-blue-100 text-black' : ''
                    }`}
                    onClick={() => handleAnswer(currentQuestion.id, opt.label)}
                  >
                    <img
                      src={opt.image_url}
                      alt={opt.label}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <p>{opt.label}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleNext}
              className="mt-6 px-6 py-3 bg-[#8a1a1d] rounded text-white hover:opacity-90 disabled:opacity-40"
              disabled={!answers[currentQuestion.id]}
            >
              다음 →
            </button>
          </div>
        )}

        {/* 완료 화면 */}
        {currentIndex === questions.length && (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">설문이 완료되었습니다!</h2>
            <p>곧 아이에게 딱 맞는 코칭 화면으로 이동할게요 :)</p>
            <button
              onClick={handleSubmitSurvey}
              className="inline-block mt-4 px-6 py-3 bg-[#8a1a1d] rounded text-white hover:opacity-90"
            >
              AI 육아코치 바로가기
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
