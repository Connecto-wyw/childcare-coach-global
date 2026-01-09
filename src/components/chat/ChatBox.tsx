// src/components/chat/ChatBox.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import ReactMarkdown from 'react-markdown'

type ChatBoxProps = { systemPrompt?: string }
type AskRes = { answer?: string; error?: string; message?: string; status?: number; body?: string }

type ChatRole = 'user' | 'assistant'
type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '')

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export default function ChatBox({ systemPrompt }: ChatBoxProps) {
  const user = useUser()
  const supabase = useSupabaseClient()

  // ====== 기존 상태(유지) ======
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const [loading, setLoading] = useState(false)
  const [dots, setDots] = useState(0)

  // guest limit
  const [guestCount, setGuestCount] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const LS_KEY = 'guest_q_count'
  const LS_DAY = 'guest_q_day'
  const GUEST_LIMIT = 2
  const today = () => new Date().toISOString().slice(0, 10)

  // ====== 새 UI용: 메시지 히스토리 ======
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const endRef = useRef<HTMLDivElement | null>(null)

  const hasChat = messages.length > 0

  // 추천 질문(첫 화면)
  const suggestions = useMemo(
    () => [
      'My child refuses to sleep. What should I do?',
      'My kid keeps yelling and talking back. How can I respond?',
      'How can I handle picky eating without forcing?',
      'My child hits friends at school. What’s a good first step?',
      'How much screen time is okay for a 6-year-old?',
    ],
    [],
  )

  // ====== 기존 로직 (그대로) ======
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

  // keyword → input
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setMessage(text ?? '')
    }
    window.addEventListener('coach:setMessage', handler as EventListener)
    return () => window.removeEventListener('coach:setMessage', handler as EventListener)
  }, [])

  // close modal on login
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setShowLoginModal(false)
    })
    return () => data.subscription.unsubscribe()
  }, [supabase])

  // loading dots
  useEffect(() => {
    if (!loading) {
      setDots(0)
      return
    }
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400)
    return () => clearInterval(id)
  }, [loading])

  const bumpGuest = () => {
    const next = guestCount + 1
    setGuestCount(next)
    localStorage.setItem(LS_KEY, String(next))
    localStorage.setItem(LS_DAY, today())
  }

  const loginGoogle = async () => {
    const redirectTo = `${SITE}/auth/callback?next=/coach`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  // 새 메시지 추가될 때 하단으로 자동 스크롤
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  const pushUserMessage = (text: string) => {
    const m: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    setMessages((prev) => [...prev, m])
  }

  const pushAiMessage = (text: string) => {
    const m: ChatMessage = {
      id: uuid(),
      role: 'assistant',
      content: text,
      createdAt: Date.now(),
    }
    setMessages((prev) => [...prev, m])
  }

  const ask = async (overrideText?: string) => {
    const q = (overrideText ?? message).trim()
    if (!q) return

    // 게스트 제한
    if (!user && guestCount >= GUEST_LIMIT) {
      setShowLoginModal(true)
      return
    }

    // UI: 먼저 유저 말풍선 추가
    pushUserMessage(q)

    setLoading(true)
    setError('')
    setDebug('')

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt ?? '',
          question: q,
          user_id: user?.id ?? null,
        }),
        cache: 'no-store',
      })

      const raw = await res.text()
      let data: AskRes = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {}

      if (!res.ok) {
        if (res.status === 403) setShowLoginModal(true)

        const friendly = 'The response is delayed. Please try again in a moment.'
        const tech = `${res.status} ${res.statusText} ${data.error || ''} ${(data.body || '').slice(0, 500)}`
        setError(friendly)
        setDebug(tech.trim())

        // UI: 에러도 assistant 말풍선 형태로 남기기(원하면 삭제 가능)
        pushAiMessage(`${friendly}\n\n(${tech.trim()})`)
        return
      }

      const answer = (data.answer || '').trim()
      if (answer) pushAiMessage(answer)

      if (!user) bumpGuest()
      setMessage('')
    } catch (e) {
      setError('Network issue. Please try again.')
      setDebug(String(e))
      pushAiMessage(`Network issue. Please try again.\n(${String(e)})`)
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

  const onPickSuggestion = (q: string) => {
    // 추천 질문 클릭 시 바로 질문
    setMessage('')
    void ask(q)
  }

  return (
    <div className="relative flex h-[100svh] w-full flex-col bg-white text-black">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-6">
        {/* 첫 화면 */}
        {!hasChat && (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center pt-16">
            <div className="mb-5 flex items-center justify-center">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-sm">
                <Image src="/assets/logo.png" alt="logo" fill className="object-cover" priority />
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-semibold leading-snug">AI can help you</div>
              <div className="mt-2 text-sm text-neutral-500">
                Ask anything about parenting. I’ll respond based on your situation.
              </div>
            </div>

            <div className="mt-8 w-full space-y-3">
              {suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onPickSuggestion(q)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:bg-neutral-50 active:scale-[0.99]"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                    Q
                  </span>
                  <span className="line-clamp-2">{q}</span>
                </button>
              ))}
            </div>

            {!user && (
              <p className="mt-5 text-xs text-neutral-400 text-center">
                You’ve used {guestCount}/{GUEST_LIMIT} questions today.
              </p>
            )}
          </div>
        )}

        {/* 대화 화면 */}
        {hasChat && (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((m) => {
              const isUser = m.role === 'user'
              return (
                <div key={m.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      isUser ? 'bg-neutral-200 text-black' : 'bg-[#C5E8F5] text-black',
                    ].join(' ')}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="whitespace-pre-wrap m-0">{children}</p>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* 로딩 */}
            {loading && (
              <div className="flex w-full justify-start">
                <div className="max-w-[85%] rounded-2xl bg-[#E4F4FA] px-4 py-3 text-sm text-neutral-600">
                  Thinking this through with you{'.'.repeat(dots)}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* 하단 입력바 고정 */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-2xl items-end gap-3">
          <div className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Type your message…"
              rows={1}
              className="max-h-32 w-full resize-none bg-transparent text-sm outline-none"
              disabled={loading}
            />
          </div>

          <button
            type="button"
            onClick={() => void ask()}
            disabled={loading || message.trim().length === 0}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white disabled:opacity-40"
            aria-label="send"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>

        {!user && (
          <div className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-neutral-400">
            You’ve used {guestCount}/{GUEST_LIMIT} questions today.
          </div>
        )}

        {/* 기존 에러 UI는 화면을 더럽히니까: 필요하면 주석 해제 */}
        {error && (
          <div className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-red-500">
            {error}
          </div>
        )}
      </div>

      {/* login modal (기존 그대로 유지) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <h3 className="text-base font-semibold text-black">
              Sign in with Google <br /> to unlock unlimited access to the AI Parenting Coach.
            </h3>
            <div className="mt-5 grid gap-2">
              <button
                onClick={loginGoogle}
                className="rounded-lg bg-black py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
              >
                Sign in with Google
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg border border-neutral-300 py-2.5 text-sm text-black hover:bg-neutral-50"
              >
                Close
              </button>
            </div>

            {debug && (
              <details className="mt-4 text-left text-xs text-neutral-500">
                <summary>Details</summary>
                <pre className="whitespace-pre-wrap">{debug}</pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
