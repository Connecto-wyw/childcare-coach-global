// src/components/chat/ChatBox.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import ReactMarkdown from 'react-markdown'

type ChatBoxProps = { systemPrompt?: string }
type AskRes = { answer?: string; error?: string; message?: string; status?: number; body?: string }

export default function ChatBox({ systemPrompt }: ChatBoxProps) {
  const user = useUser()
  const supabase = useSupabaseClient()

  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const [loading, setLoading] = useState(false)

  // ⬇️ 로딩 점 애니메이션용 상태
  const [dots, setDots] = useState(0)

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

  // ⬇️ 로딩 중 버튼 "함께 고민 중..." 점 애니메이션
  useEffect(() => {
    if (!loading) { setDots(0); return }
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400)
    return () => clearInterval(id)
  }, [loading])

  const bumpGuest = () => {
    const next = guestCount + 1
    setGuestCount(next)
    localStorage.setItem(LS_KEY, String(next))
    localStorage.setItem(LS_DAY, today())
  }

  const loginKakao = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${origin}/auth/callback?next=/coach` },
    })
  }

  const ask = async () => {
    const q = message.trim()
    if (!q) return
    if (!user && guestCount >= GUEST_LIMIT) {
      setShowLoginModal(true)
      return
    }

    setLoading(true)
    setError('')
    setDebug('')
    setReply('')

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt ?? '', question: q, user_id: user?.id ?? null }),
        cache: 'no-store',
      })

      const raw = await res.text()
      let data: AskRes = {}
      try { data = raw ? JSON.parse(raw) : {} } catch {}

      if (!res.ok) {
        if (res.status === 403) setShowLoginModal(true)
        const friendly = '일시적으로 응답이 지연되었어요. 잠시 후 다시 시도해 주세요.'
        const tech = `${res.status} ${res.statusText} ${data.error || ''} ${(data.body || '').slice(0, 500)}`
        setError(friendly)
        setDebug(tech.trim())
        return
      }

      setReply((data.answer || '').trim())
      if (!user) bumpGuest()
      setMessage('')
    } catch (e) {
      setError('네트워크 상태가 불안정합니다. 다시 시도해 주세요.')
      setDebug(String(e))
    } finally {
      setLoading(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void ask()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* 입력 영역 */}
      <div className="mt-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onEnter}
          placeholder="Please feel free to ask the AI Parenting Coach anything about your current parenting challenges!"
          className="w-full min-h-[120px] rounded-md border border-gray-600 bg-[#111] text-[#eae3de] px-3 py-3 outline-none"
          disabled={loading}
        />
        <div className="flex items-center justify-center mt-3">
          <button
            onClick={ask}
            disabled={loading}
            className="h-10 rounded-md bg-[#3EB6F1] text-white px-8 text-base hover:bg-[#299ed9] disabled:opacity-60"
          >
            {loading ? `Thinking this through with you.${'.'.repeat(dots)}` : 'Ask now'}
          </button>
        </div>

        {/* 게스트 무료 횟수 표시 */}
        {!user && (
          <p className="mt-1 text-xs text-gray-400 text-center">
            You’ve used {guestCount}/{GUEST_LIMIT} questions today.
          </p>
        )}

        {error && (
          <div className="mt-3 text-sm">
            <div className="rounded-md bg-[#422] text-[#fbb] p-2 text-center">{error}</div>
            {debug && (
              <details className="mt-2 text-xs text-gray-400">
                <summary>자세히</summary>
                <pre className="whitespace-pre-wrap">{debug}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* 응답 */}
      {reply && (
        <div className="mt-6 rounded-2xl border border-gray-700 p-4 text-[#eae3de] prose prose-invert max-w-none leading-7 space-y-3">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
            }}
          >
            {reply}
          </ReactMarkdown>
        </div>
      )}

      {/* 게스트 초과 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-[#191919] p-6 text-center">
            <h3 className="text-base font-semibold text-[#eae3de]">
              Sign in with Google <br /> to unlock unlimited access to the AI Parenting Coach.
            </h3>
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
