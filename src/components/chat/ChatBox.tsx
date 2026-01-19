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
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 메시지 영역 높이 자동 확장
  const [scrollHeightPx, setScrollHeightPx] = useState<number>(200)
  const MIN_H = 160
  const MAX_H = 520

  // ✅ 하단 플로팅 입력창 높이만큼 "메시지 영역/페이지"가 가려지지 않도록 여백 확보
  // (textarea + button + border + 여백 고려해서 안전하게)
  const FLOAT_ESTIMATED_H = 96

  useEffect(() => {
    if (user) setShowLoginModal(false)
  }, [user])

  useEffect(() => {
    if (!loading) {
      setDots(0)
      return
    }
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400)
    return () => clearInterval(id)
  }, [loading])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const contentHeight = el.scrollHeight
    const target = Math.min(MAX_H, Math.max(MIN_H, contentHeight))
    if (target !== scrollHeightPx) setScrollHeightPx(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

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
      {/* 메시지 영역 (floating input 때문에 아래쪽 여백 확보) */}
      <div
        ref={scrollRef}
        style={{ height: `${scrollHeightPx}px`, paddingBottom: `${FLOAT_ESTIMATED_H}px` }}
        className="overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="h-full" />
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={[
                    'max-w-[80%] rounded-xl px-4 py-3',
                    'text-[15px] leading-relaxed',
                    m.role === 'user'
                      ? 'bg-[#f0f1f6] text-[#0e0e0e] font-bold'
                      : 'bg-white border border-[#dcdcdc] text-[#0e0e0e] font-medium',
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
                <div className="rounded-xl bg-white border border-[#dcdcdc] px-4 py-3 text-[15px] font-medium text-[#0e0e0e]">
                  Thinking{'.'.repeat(dots)}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* ✅ 하단 플로팅 입력창 (항상 보이게) */}
      <div className="fixed left-0 right-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border border-[#dcdcdc] bg-white shadow-sm">
            <div className="flex items-stretch">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void ask()
                  }
                }}
                placeholder="Anything on your mind?"
                rows={1}
                disabled={loading}
                className={[
                  'flex-1 resize-none outline-none',
                  'bg-[#f5f5f5]',
                  'px-4 py-3',
                  'text-[15px] font-bold text-[#0e0e0e]',
                  'placeholder:text-[#dcdcdc] placeholder:font-normal',
                  'leading-[24px]',
                ].join(' ')}
              />
              <button
                onClick={() => void ask()}
                disabled={loading || !input.trim()}
                className={[
                  'w-[92px]',
                  'bg-[#DA3632] text-white',
                  'text-[15px] font-semibold',
                  'disabled:opacity-50',
                ].join(' ')}
              >
                Send
              </button>
            </div>
          </div>

          {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-white p-6 text-center text-[#0e0e0e] border border-[#dcdcdc]">
            <h3 className="text-[13px] font-semibold text-[#1e1e1e]">Sign in to continue</h3>

            <div className="mt-4 grid gap-2">
              <button onClick={loginGoogle} className="h-10 bg-[#1e1e1e] text-white text-[13px] font-semibold">
                Sign in
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="h-10 border border-[#dcdcdc] text-[13px] font-medium text-[#1e1e1e]"
              >
                Close
              </button>
            </div>

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
