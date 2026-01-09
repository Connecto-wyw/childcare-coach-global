// src/components/chat/ChatBox.tsx
'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import ReactMarkdown from 'react-markdown'

type ChatBoxProps = { systemPrompt?: string }
type AskRes = { answer?: string; error?: string; body?: string }

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

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [dots, setDots] = useState(0)

  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')

  // guest limit
  const [guestCount, setGuestCount] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const LS_KEY = 'guest_q_count'
  const LS_DAY = 'guest_q_day'
  const GUEST_LIMIT = 2
  const today = () => new Date().toISOString().slice(0, 10)

  const endRef = useRef<HTMLDivElement | null>(null)

  // ✅ 높이 자동 확장(초기 = 작게, 대화가 쌓이면 늘어남)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollHeightPx, setScrollHeightPx] = useState<number>(260) // 초기 높이(기존 520의 "반" 정도)
  const MIN_H = 260
  const MAX_H = 720 // 너무 길어지면 여기서부터는 내부 스크롤로

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

  // ✅ keyword 버튼 → ChatBox 연동 이벤트 (input 채우고 바로 ask 실행)
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      const q = (text ?? '').trim()
      if (!q) return

      if (loading) {
        setInput(q)
        return
      }

      setInput(q)
      void ask(q)
    }

    window.addEventListener('coach:setMessage', handler as EventListener)
    return () => window.removeEventListener('coach:setMessage', handler as EventListener)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setShowLoginModal(false)
    })
    return () => data.subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!loading) {
      setDots(0)
      return
    }
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400)
    return () => clearInterval(id)
  }, [loading])

  // ✅ 메시지/로딩 변화에 따라 높이 자동 계산
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // 스크롤 영역의 실제 콘텐츠 높이
    const contentHeight = el.scrollHeight
    // padding/여백 포함해서 적당히
    const target = Math.min(MAX_H, Math.max(MIN_H, contentHeight))
    if (target !== scrollHeightPx) setScrollHeightPx(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

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

  const push = (role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { id: uuid(), role, content, createdAt: Date.now() }])
  }

  const ask = async (override?: string) => {
    const q = (override ?? input).trim()
    if (!q) return

    if (!user && guestCount >= GUEST_LIMIT) {
      setShowLoginModal(true)
      return
    }

    push('user', q)
    setInput('')
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
      const data: AskRes = raw ? JSON.parse(raw) : {}

      if (!res.ok) {
        if (res.status === 403) setShowLoginModal(true)
        throw new Error(`${res.status} ${data.error || ''} ${(data.body || '').slice(0, 300)}`)
      }

      const answer = (data.answer || '').trim()
      if (answer) push('assistant', answer)

      if (!user) bumpGuest()
    } catch (e) {
      const msg = 'The response is delayed. Please try again.'
      setError(msg)
      setDebug(String(e))
      push('assistant', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Chat Card (Dark Gray) */}
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#3a3a3a] bg-[#3b3b3b] overflow-hidden">
        {/* Messages 영역: 자동 확장 + MAX 넘어가면 내부 스크롤 */}
        <div
          ref={scrollRef}
          style={{ height: `${scrollHeightPx}px` }}
          className="overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="h-full" />
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-black',
                      m.role === 'user'
                        ? 'bg-[#d0d0d0]'
                        : 'bg-white border border-[#cfcfcf]',
                    ].join(' ')}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-0 prose-li:my-0">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="m-0 whitespace-pre-wrap">{children}</p>
                            ),
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white border border-[#cfcfcf] px-4 py-3 text-sm text-black">
                    Thinking{'.'.repeat(dots)}
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Input 영역: 카드 하단 고정(sticky) */}
        <div className="sticky bottom-0 border-t border-[#2f2f2f] bg-[#363636] px-4 py-3">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void ask()
                }
              }}
              placeholder="Type your question, or tap one of the suggestions above."
              rows={2}
              className="flex-1 resize-none rounded-xl bg-white px-4 py-3 text-sm text-black outline-none border border-[#cfcfcf]"
              disabled={loading}
            />
            <button
              onClick={() => void ask()}
              disabled={loading || !input.trim()}
              className="h-[44px] rounded-xl bg-[#3EB6F1] px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>

          {!user && (
            <p className="mt-2 text-center text-xs text-gray-200">
              {guestCount}/{GUEST_LIMIT} free questions today
            </p>
          )}

          {error && <p className="mt-1 text-center text-xs text-red-200">{error}</p>}
        </div>
      </div>

      {/* login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center text-black">
            <h3 className="text-sm font-semibold">Sign in with Google to unlock unlimited access.</h3>
            <div className="mt-4 grid gap-2">
              <button onClick={loginGoogle} className="rounded-lg bg-black py-2 text-sm text-white">
                Sign in with Google
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg border border-gray-300 py-2 text-sm"
              >
                Close
              </button>
            </div>

            {debug && (
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-left text-xs text-gray-600">
                {debug}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
