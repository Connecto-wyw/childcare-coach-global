// src/components/chat/ChatBox.tsx
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuthUser, useSupabase } from '@/app/providers'

type ChatBoxProps = { systemPrompt?: string }
type AskRes = { answer?: string; error?: string; body?: string }

type ChatRole = 'user' | 'assistant'
type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

function getSiteOrigin() {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envSite) return stripTrailingSlash(envSite)
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export default function ChatBox({ systemPrompt }: ChatBoxProps) {
  const { user } = useAuthUser()
  const supabase = useSupabase()

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

  // ✅ 로그인 되면 모달 자동 닫기 (Providers가 세션을 갱신하므로 user만 보면 됨)
  useEffect(() => {
    if (user) setShowLoginModal(false)
  }, [user])

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

  // ✅ PKCE mismatch 방지용: redirectTo origin을 "고정된 SITE" 우선으로 계산
  const getAuthRedirectTo = useCallback(() => {
    const base = getSiteOrigin()
    return `${base}/auth/callback?next=/coach`
  }, [])

  const loginGoogle = useCallback(async () => {
    const redirectTo = getAuthRedirectTo()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }, [supabase, getAuthRedirectTo])

  const push = useCallback((role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { id: uuid(), role, content, createdAt: Date.now() }])
  }, [])

  const ask = useCallback(
    async (override?: string) => {
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
        let data: AskRes = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          data = {}
        }

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
    },
    [input, user, push, systemPrompt]
  )

  // ✅ keyword 버튼 → ChatBox 연동 이벤트
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
  }, [user, loading, ask])

  return (
    <div className="w-full">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#3a3a3a] bg-[#3b3b3b] overflow-hidden">
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
                      m.role === 'user' ? 'bg-[#d0d0d0]' : 'bg-white border border-[#cfcfcf]',
                    ].join(' ')}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-0 prose-li:my-0">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="m-0 whitespace-pre-wrap">{children}</p>,
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

        <div className="border-t border-[#2f2f2f] bg-[#363636] px-4 py-3">
          <div className="flex items-center gap-3">
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

            {/* 디버그: 로그인 상태/오류 확인용 (원하면 이 블록 자체를 삭제해도 됨) */}
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-left text-xs text-gray-600">
              user: {user?.id ?? 'null'}
              {'\n'}
              {debug ? `error: ${debug}` : ''}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
