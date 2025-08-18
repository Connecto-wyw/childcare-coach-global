// src/components/chat/ChatBox.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'

type ChatBoxProps = { systemPrompt?: string }

export default function ChatBox({ systemPrompt }: ChatBoxProps) {
  const user = useUser()
  const supabase = useSupabaseClient()

  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  // 게스트 2회 제한
  const [guestCount, setGuestCount] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const LS_KEY = 'guest_q_count'
  const LS_DAY = 'guest_q_day'
  const GUEST_LIMIT = 2
  const today = () => new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const d = localStorage.getItem(LS_DAY)
    const c = parseInt(localStorage.getItem(LS_KEY) || '0', 10)
    if (d !== today()) {
      localStorage.setItem(LS_DAY, today())
      localStorage.setItem(LS_KEY, '0')
      setGuestCount(0)
    } else {
      setGuestCount(Number.isFinite(c) ? c : 0)
    }
  }, [])

  // 키워드 → 입력창 자동 채우기
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setMessage(text ?? '')
    }
    window.addEventListener('coach:setMessage', handler as EventListener)
    return () => window.removeEventListener('coach:setMessage', handler as EventListener)
  }, [])

  // 로그인 완료되면 모달 닫기
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setShowLoginModal(false)
    })
    return () => data.subscription.unsubscribe()
  }, [supabase])

  const bumpGuest = () => {
    const next = guestCount + 1
    setGuestCount(next)
    localStorage.setItem(LS_KEY, String(next))
    localStorage.setItem(LS_DAY, today())
  }

  const ask = async () => {
    if (!message.trim()) return
    if (!user && guestCount >= GUEST_LIMIT) {
      setShowLoginModal(true)
      return
    }
    try {
      setLoading(true)
      setReply('')
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt ?? '',
          question: message,
          user_id: user?.id ?? null,
        }),
      })
      if (!res.ok) {
        if (res.status === 403) {
          setShowLoginModal(true)
          return
        }
        throw new Error('request_failed')
      }
      const data = await res.json()
      setReply(data.answer ?? '')
      if (!user) bumpGuest()
      setMessage('')
    } finally {
      setLoading(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey === false) {
      e.preventDefault()
      void ask()
    }
  }

  const loginKakao = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${origin}/auth/callback?next=/coach`,
      },
    })
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* 입력 영역 */}
      <div className="mt-6">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onEnter}
          placeholder="요즘 육아 고민을 AI 육아코치에게 질문해보세요."
          className="w-full min-h-[120px] rounded-md border border-gray-600 bg-[#111] text-[#eae3de] px-3 py-3 outline-none"
          disabled={loading}
        />
        <div className="flex justify-center mt-3">
          <button
            onClick={ask}
            disabled={loading}
            className="h-10 rounded-md bg-[#3EB6F1] text-white px-8 text-base hover:bg-[#299ed9] disabled:opacity-60"
          >
            {loading ? '함께 고민 중' : '질문하기'}
          </button>
        </div>
        {!user && (
          <p className="mt-2 text-xs text-gray-400">오늘 {guestCount}/{GUEST_LIMIT}개 질문 사용</p>
        )}
      </div>

      {/* 응답 */}
      {reply && (
        <div className="mt-6 rounded-2xl border border-gray-700 p-4 text-sm text-[#eae3de]">
          {reply}
        </div>
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-[#191919] p-6 text-center">
            <h3 className="text-base font-semibold text-[#eae3de]">
              카카오톡 로그인하고 <br /> AI육아코치 무제한으로 사용하세요.
            </h3>
            <p className="mt-2 text-xs text-gray-400">
              로그인 안 하면 하루 2번, 카카오톡 로그인하면 제한 없이 쓸 수 있어요
            </p>
            <div className="mt-5 grid gap-2">
              <button
                onClick={loginKakao}
                className="rounded-lg bg-[#FEE500] py-2.5 text-sm font-medium text-black hover:bg-[#F2D000] transition"
              >
                카카오로 2초 로그인
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg border border-gray-600 py-2.5 text-sm text-[#eae3de] hover:bg-gray-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
