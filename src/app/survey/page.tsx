'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*, survey_options(*)')
        .order('order', { ascending: true })

      if (!error && data) {
        const formatted = data.map((q: any) => ({
          ...q,
          options: q.survey_options || [],
        }))
        setQuestions(formatted)
      } else {
        console.error('질문 불러오기 에러:', error)
      }
    }

    fetchData()
  }, [])

  const handleAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    const next = currentIndex + 1

    if (next < questions.length) {
      setCurrentIndex(next)
    } else {
      // 모든 질문에 응답 완료 → /coach 페이지로 이동
      router.push('/coach')
    }
  }

  const q = questions[currentIndex]

  if (!q) return <p className="p-4">질문을 불러오는 중입니다...</p>

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">간단한 설문에 참여해보세요</h1>
      <p className="mb-2 font-medium">{q.question}</p>

      {q.question_format === 'multiple_choice' &&
        q.options?.map((opt) => (
          <button
            key={opt.id}
            className={`block border p-2 rounded w-full text-left mb-1 ${
              answers[q.id] === opt.label ? 'bg-blue-100' : ''
            }`}
            onClick={() => handleAnswer(q.id, opt.label)}
          >
            {opt.label}
          </button>
        ))}

      {q.question_format === 'scale' && (
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <label key={n} className="flex flex-col items-center text-sm">
              <input
                type="radio"
                name={`scale-${q.id}`}
                checked={answers[q.id] === String(n)}
                onChange={() => handleAnswer(q.id, String(n))}
              />
              {n}
            </label>
          ))}
        </div>
      )}

      {q.question_format === 'text' && (
        <div className="flex flex-col">
          <textarea
            className="w-full border rounded p-2 mt-2"
            placeholder="답변을 입력하세요"
            value={answers[q.id] || ''}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
          />
          <button
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => handleAnswer(q.id, answers[q.id] || '')}
          >
            다음
          </button>
        </div>
      )}

      {q.question_format === 'image_choice' && (
        <div className="grid grid-cols-2 gap-2">
          {q.options?.map((opt) => (
            <div
              key={opt.id}
              className={`border p-2 rounded text-center cursor-pointer ${
                answers[q.id] === opt.label ? 'bg-blue-100' : ''
              }`}
              onClick={() => handleAnswer(q.id, opt.label)}
            >
              <img
                src={opt.image_url}
                alt={opt.label}
                className="w-full h-32 object-cover mb-2 rounded"
              />
              <p>{opt.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
