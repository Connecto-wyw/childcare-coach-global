'use client'

import { useState, useEffect } from 'react'
import { saveChatLog } from '@/lib/saveChatLog'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'

type ChatBoxProps = {
  systemPrompt?: string
  initialQuestion?: string // 부모(코치 페이지)에서 전달받는 초기 질문
  chatInput?: string // 부모에서 넘겨주는 채팅 입력값
  setChatInput?: React.Dispatch<React.SetStateAction<string>> // 부모 상태 변경 함수
}

export default function ChatBox({
  systemPrompt,
  initialQuestion,
  chatInput,
  setChatInput,
}: ChatBoxProps) {
  const user = useUser()
  console.log('💡 user_id in ChatBox:', user?.id)

  const [message, setMessage] = useState(chatInput || '')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false) // GPT 호출 가능 여부

  // ==== 비로그인 2회 허용 + 3번째 시 확인 팝업 후 카카오 로그인 ====
  const KAKAO_REDIRECT = 'https://hrvbdyusoybsviiuboac.supabase.co/auth/v1/callback'
  const dailyKey = () => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `aiCoachAnonCount:${yyyy}-${mm}-${dd}`
  }
  const getAnonCount = () => {
    if (typeof window === 'undefined') return 0
    const raw = localStorage.getItem(dailyKey())
    return raw ? Number(raw) || 0 : 0
  }
  const setAnonCount = (n: number) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(dailyKey(), String(n))
  }
  // =======================================================

  // chatInput이 바뀌면 message 상태도 같이 변경
  useEffect(() => {
    if (chatInput !== undefined) {
      setMessage(chatInput)
    }
  }, [chatInput])

  // 1.5초 지연 후 활성화
  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // 오늘 카운트 키 없으면 0으로 초기화
  useEffect(() => {
    if (!user?.id && typeof window !== 'undefined' && localStorage.getItem(dailyKey()) === null) {
      setAnonCount(0)
    }
  }, [user?.id])

  // 인기 키워드 클릭 시 자동 질문 처리
  useEffect(() => {
    if (initialQuestion && ready) {
      setMessage(initialQuestion)
      sendMessage(initialQuestion)
      if (setChatInput) setChatInput(initialQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, ready])

  const sendMessage = async (customMessage?: string) => {
    const text = customMessage || message
    if (!text.trim()) return
    if (!ready) {
      setReply('잠시만 기다려 주세요. 설문 데이터 동기화 중입니다.')
      return
    }

    // 🔸 비로그인 사용자의 1~2번째 질문은 허용, 3번째 시 확인 팝업 → 동의하면 카카오 로그인
    if (!user?.id) {
      const count = getAnonCount()
      if (count >= 2) {
        const ok = window.confirm(
          '카카오톡 로그인을 하시면 질문을 무제한으로 사용할 수 있어요.\n지금 로그인하시겠어요?'
        )
        if (ok) {
          await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: { redirectTo: KAKAO_REDIRECT },
          })
        } else {
          setReply('로그인 없이 이용 시 오늘은 최대 2회까지만 질문할 수 있어요.')
        }
        return
      }
    }

    setLoading(true)
    setReply('')

    try {
      const payload = {
        user_id: user?.id, // 비로그인 시 undefined 전달
        messages: [
          {
            role: 'system',
            content:
              systemPrompt ||
              '당신은 친절하지만 현실적인 육아 전문가입니다. 정확하고 신중하게 답변하세요.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      const answer = data?.reply || '답변을 가져오지 못했어요.'
      setReply(answer)

      if (user?.id) {
        await saveChatLog(text, answer, user.id)
      } else {
        // 비로그인 성공 시 카운트 증가 (1~2번째)
        setAnonCount(getAnonCount() + 1)
      }
    } catch (error) {
      console.error('에러:', error)
      setReply('에러가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  const onChangeMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (setChatInput) setChatInput(e.target.value)
  }

  const remaining = Math.max(0, 2 - getAnonCount())

  return (
    <div className="p-4 max-w-xl mx-auto mt-4">
      <textarea
        className="w-full p-2 border rounded"
        rows={4}
        placeholder="요즘 육아 고민을 AI 육아코치에게 질문해보세요."
        value={message}
        onChange={onChangeMessage}
      />

      <div className="flex justify-center mt-2">
        <button
          onClick={() => sendMessage()}
          disabled={loading || !ready}
          className="px-4 py-2 bg-[#3fb1df] text-white text-base rounded disabled:opacity-50"
        >
          {!ready ? '준비 중...' : loading ? '함께 고민 중..' : '질문하기'}
        </button>
      </div>

      {/* 남은 무료 질문 수 표시 (비로그인 사용자만) */}
      {!user?.id && (
        <div className="mt-2 text-xs text-gray-500 text-right">
          오늘 남은 무료 질문: <span className="font-semibold">{remaining}</span>개
        </div>
      )}

      {reply && (
        <div className="mt-4 p-4 border rounded bg-[#333333] whitespace-pre-line text-left text-base text-white">
          {reply}
        </div>
      )}
    </div>
  )
}
