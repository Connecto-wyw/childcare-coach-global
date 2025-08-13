'use client'

import { useState, useEffect } from 'react'
import { saveChatLog } from '@/lib/saveChatLog'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'

type ChatBoxProps = {
  systemPrompt?: string
  initialQuestion?: string
  chatInput?: string
  setChatInput?: React.Dispatch<React.SetStateAction<string>>
}

export default function ChatBox({
  systemPrompt,
  initialQuestion,
  chatInput,
  setChatInput,
}: ChatBoxProps) {
  const user = useUser()
  const [message, setMessage] = useState(chatInput || '')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // ── 설정 ─────────────────────────────────────────────────────────────
  const KAKAO_REDIRECT = 'https://hrvbdyusoybsviiuboac.supabase.co/auth/v1/callback'
  const MAX_FREE_TRIES = 2 // 비로그인 시 1~2회 버튼 클릭 허용, 3번째에 팝업

  const dayKey = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`
  }
  const TRY_KEY = `aiCoachAnonTry:${dayKey()}`
  const readTry = () =>
    typeof window === 'undefined' ? 0 : Number(localStorage.getItem(TRY_KEY)) || 0

  const [anonTry, setAnonTry] = useState(0)
  const incTry = () => {
    setAnonTry(prev => {
      const next = prev + 1
      if (typeof window !== 'undefined') localStorage.setItem(TRY_KEY, String(next))
      return next
    })
  }
  const syncTryFromStorage = () => {
    const cur = readTry()
    localStorage.setItem(TRY_KEY, String(cur)) // 키 없으면 0으로 고정
    setAnonTry(cur)
  }
  // ────────────────────────────────────────────────────────────────────

  // 비로그인 진입 시 시도 수 동기화
  useEffect(() => {
    if (!user?.id) syncTryFromStorage()
  }, [user?.id])

  // 외부 입력 동기화
  useEffect(() => {
    if (chatInput !== undefined) setMessage(chatInput)
  }, [chatInput])

  // 준비 타이머
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500)
    return () => clearTimeout(t)
  }, [])

  // initialQuestion 자동 전송
  useEffect(() => {
    if (initialQuestion && ready) {
      setMessage(initialQuestion)
      sendMessage(initialQuestion)
      setChatInput?.(initialQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, ready])

  const sendMessage = async (customMessage?: string) => {
    const text = (customMessage ?? message).trim()
    if (!text) return
    if (!ready) {
      setReply('잠시만 기다려 주세요. 설문 데이터 동기화 중입니다.')
      return
    }

    // 비로그인: 3번째 클릭 시 팝업 → 동의하면 카카오 로그인, 아니면 안내
    if (!user?.id) {
      if (anonTry >= MAX_FREE_TRIES) {
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
      // 1~2번째: 버튼 클릭 즉시 시도 +1 (API 성공/실패 무관)
      incTry()
    }

    setLoading(true)
    setReply('')

    try {
      const payload = {
        user_id: user?.id, // 비로그인 시 undefined
        messages: [
          {
            role: 'system',
            content:
              systemPrompt ||
              '당신은 친절하지만 현실적인 육아 전문가입니다. 정확하고 신중하게 답변하세요.',
          },
          { role: 'user', content: text },
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
      }
    } catch (e) {
      console.error('에러:', e)
      setReply('에러가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  const onChangeMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    setChatInput?.(e.target.value)
  }

  const remaining = !user?.id ? Math.max(0, MAX_FREE_TRIES - anonTry) : Infinity

  return (
    <div className="p-4 max-w-xl mx-auto mt-4">
      <div className="relative">
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="요즘 육아 고민을 AI 육아코치에게 질문해보세요."
          value={message}
          onChange={onChangeMessage}
        />

        {/* 비로그인일 때만 우측 상단 작게 표기 */}
        {!user?.id && (
          <div className="absolute top-2 right-2 text-[11px] text-gray-500">
            오늘 남은 무료 질문: <span className="font-semibold">{remaining}</span>개
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div /> {/* 정렬용 */}
        <button
          onClick={() => sendMessage()}
          disabled={loading || !ready}
          className="px-4 py-2 bg-[#3fb1df] text-white text-base rounded disabled:opacity-50"
        >
          {!ready ? '준비 중...' : loading ? '함께 고민 중..' : '질문하기'}
        </button>
      </div>

      {reply && (
        <div className="mt-4 p-4 border rounded bg-[#333333] whitespace-pre-line text-left text-base text-white">
          {reply}
        </div>
      )}
    </div>
  )
}
