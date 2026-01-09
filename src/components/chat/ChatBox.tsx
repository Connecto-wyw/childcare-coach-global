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

  const [showLoginModal, setShowLoginModal] = useState(false)

  const endRef = useRef<HTMLDivElement | null>(null)

  // ✅ 높이 자동 확장(초기 = 작게, 대화가 쌓이면 늘어남)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollHeightPx, setScrollHeightPx] = useState<number>(260)
  const MIN_H = 260
  const MAX_H = 720

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

  // auto grow height
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const contentHeight = el.scrollHeight
    const target = Math.min(MAX_H, Math.max(MIN_H, contentHeight))
    if (target !== scrollHeightPx) setScrollHeightPx(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading])

  // scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

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

    // ✅ 첫 질문부터 로그인 강제
    if (!user) {
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
          user_id: user.id,
        }),
        cache: 'no-store',
      })

      const raw = await res.text()
      const data: AskRes = raw ? JSON.parse(raw) : {}

      if (!res.ok) {
        throw new Error(`${res.status} ${data.error || ''} ${(data.body || '').slice(0, 300)}`)
      }

      const answer = (data.answer || '').trim()
      if (answer) push('assistant', answer)
    } catch (e) {
      const msg = 'The response is delayed. Please try again.'
      setError(msg)
      setDebug(String(e))
      push('assistant', msg)
    } finally {
      setLoading(false)
    }
  }

  // ✅ keyword 버튼 → ChatBox 연동 이벤트
  // - 로그인 안 했으면: 입력만 채우고 로그인 모달 띄움
  // - 로그인 했으면: 바로 ask 실행
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      const q = (text ?? '').trim()
      if (!q) return

      setInput(q)

      if (!user) {
        setShowLoginModal(true)
        return
      }

      if (loading) return
      void ask(q)
    }

    window.addEventListener('coach:setMessage', handler as EventListener)
    return () => window.removeEventListener('coach:setMessage', handler as EventListener)
  }, [user, loading]) // user/로딩 최신값 반영

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

        {/* Input 영역 */}
        <div className="border-t border-[#2f2f2f] bg-[#363636] px-4 py-3">
          <div className="flex items-center gap-3">
            {/* ✅ textarea 높이 = 버튼 높이 */}
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
              rows={1}
              className="flex-1 h-[44px] resize-none rounded-xl bg-white px-4 py-2 text-sm text-black outline-none border border-[#cfcfcf] leading-[24px]"
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

          {error && <p className="mt-2 text-center text-xs text-red-200">{error}</p>}
        </div>
      </div>

      {/* login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center text-black">
            <h3 className="text-sm font-semibold">Sign in with Google to continue.</h3>
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
