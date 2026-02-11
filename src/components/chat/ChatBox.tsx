// src/components/chat/ChatBox.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuthUser, useSupabase } from '@/app/providers'

type ChatBoxProps = { systemPrompt?: string }
type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}

type ApiChatOk = {
  answer?: string
  requestId?: string
  sessionId?: string
  insertOk?: boolean
  insertError?: string | null
}
type ApiChatErr = { error?: string; requestId?: string; message?: string; body?: string; status?: number }

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

// ✅ 비로그인 유저도 안정적으로 식별하기 위한 localStorage sessionId
const SESSION_KEY = 'cc_session_id'
function getOrCreateSessionId() {
  if (typeof window === 'undefined') return uuid()
  try {
    const existing = window.localStorage.getItem(SESSION_KEY)
    if (existing && existing.trim()) return existing.trim()
    const created = uuid()
    window.localStorage.setItem(SESSION_KEY, created)
    return created
  } catch {
    return uuid()
  }
}

export default function ChatBox({ systemPrompt }: ChatBoxProps) {
  const { user } = useAuthUser()
  const supabase = useSupabase()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [dots, setDots] = useState(0)

  const [error, setError] = useState('')

  const [sessionId, setSessionId] = useState('')

  const endRef = useRef<HTMLDivElement | null>(null)
  const chatBarRef = useRef<HTMLDivElement | null>(null)

  const didMountRef = useRef(false)
  const prevMsgLenRef = useRef(0)

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  useEffect(() => {
    if (!loading) {
      setDots(0)
      return
    }
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400)
    return () => clearInterval(id)
  }, [loading])

  useEffect(() => {
    const el = chatBarRef.current
    if (!el) return

    const set = () => {
      const h = el.getBoundingClientRect().height
      document.documentElement.style.setProperty('--chatbar-h', `${Math.ceil(h)}px`)
    }

    set()

    const ro = new ResizeObserver(() => set())
    ro.observe(el)

    window.addEventListener('resize', set)
    window.addEventListener('orientationchange', set)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', set)
      window.removeEventListener('orientationchange', set)
    }
  }, [])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      prevMsgLenRef.current = messages.length
      return
    }

    const prevLen = prevMsgLenRef.current
    const nowLen = messages.length
    prevMsgLenRef.current = nowLen

    const shouldScroll = nowLen > prevLen || loading
    if (!shouldScroll) return

    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, loading])

  const getAuthRedirectTo = useCallback(() => {
    const base = getSiteOrigin()
    return `${base}/auth/callback?next=/coach`
  }, [])

  // (유지) 다른 UI에서 로그인 버튼을 쓸 수도 있어서 함수는 남김
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

  async function safeJsonParse<T>(raw: string): Promise<T | null> {
    try {
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }

  const ask = useCallback(
    async (override?: string) => {
      const q = (override ?? input).trim()
      if (!q) return

      const sid = sessionId || getOrCreateSessionId()

      push('user', q)
      setInput('')
      setLoading(true)
      setError('')

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: systemPrompt ?? '',
            question: q,
            sessionId: sid, // ✅ 비로그인도 식별자 전달
          }),
          cache: 'no-store',
        })

        const raw = await res.text()

        if (!res.ok) {
          const errJson = await safeJsonParse<ApiChatErr>(raw)
          const rid = errJson?.requestId ? ` (requestId: ${errJson.requestId})` : ''
          const core = `Error ${res.status}${rid}\n\n${errJson?.error || errJson?.message || 'api/chat failed'}`
          setError(core)
          push('assistant', core)
          return
        }

        const okJson = await safeJsonParse<ApiChatOk>(raw)
        const answer = (okJson?.answer || '').trim()

        // 서버가 sessionId를 돌려주면 동기화(선택)
        if (okJson?.sessionId && okJson.sessionId !== sid) {
          try {
            window.localStorage.setItem(SESSION_KEY, okJson.sessionId)
            setSessionId(okJson.sessionId)
          } catch {}
        }

        // ✅ 저장 실패는 화면에 노출하지 않고 콘솔로만 남김
        if (okJson?.insertOk === false) {
          console.warn('[chat_logs insert failed]', {
            requestId: okJson?.requestId,
            sessionId: okJson?.sessionId ?? sid,
            userId: user?.id ?? null,
            insertError: okJson?.insertError ?? null,
          })
        }

        if (!answer) {
          const rid = okJson?.requestId ? ` (requestId: ${okJson.requestId})` : ''
          const msg = `Empty answer from server${rid}`
          setError(msg)
          push('assistant', msg)
          return
        }

        push('assistant', answer)
      } catch (e) {
        const msg = 'The response is delayed. Please try again.'
        setError(msg)
        push('assistant', msg)
      } finally {
        setLoading(false)
      }
    },
    [input, sessionId, push, systemPrompt, user?.id]
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      const q = (text ?? '').trim()
      if (!q) return

      setInput(q)
      if (loading) return
      void ask(q)
    }

    window.addEventListener('coach:setMessage', handler as EventListener)
    return () => window.removeEventListener('coach:setMessage', handler as EventListener)
  }, [loading, ask])

  return (
    <div className="w-full">
      <div className="space-y-3 pb-[calc(var(--chatbar-h,96px)+16px)]">
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
                // ✅ 문단/리스트 간격이 “정상”으로 보이도록 prose 마진을 0으로 죽이지 않는다
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      // ✅ 문단은 여백을 줘야 문단이 문단처럼 보임
                      p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,

                      // ✅ 헤딩도 간격/크기 정리
                      h1: ({ children }) => <h1 className="mt-3 mb-2 text-[16px] font-semibold">{children}</h1>,
                      h2: ({ children }) => <h2 className="mt-3 mb-2 text-[16px] font-semibold">{children}</h2>,
                      h3: ({ children }) => <h3 className="mt-3 mb-2 text-[15px] font-semibold">{children}</h3>,
                      h4: ({ children }) => <h4 className="mt-3 mb-2 text-[15px] font-semibold">{children}</h4>,

                      // ✅ 리스트가 붙어 보이지 않게 기본 여백/들여쓰기
                      ul: ({ children }) => <ul className="my-2 pl-5 list-disc">{children}</ul>,
                      ol: ({ children }) => <ol className="my-2 pl-5 list-decimal">{children}</ol>,
                      li: ({ children }) => <li className="my-1">{children}</li>,
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

      <div ref={chatBarRef} className="fixed left-0 right-0 bottom-0 z-50 bg-white border-t border-[#eeeeee]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="border border-[#dcdcdc] bg-white shadow-sm">
            <div className="flex items-stretch gap-2">
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
                  'cursor-pointer',
                  'disabled:cursor-not-allowed',
                ].join(' ')}
              >
                Send
              </button>
            </div>
          </div>

          {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {/* ✅ 아래 디버그 표시(<pre>)는 완전히 제거됨 */}
      {/* loginGoogle 함수는 유지(다른 UI에서 재사용 가능) */}
    </div>
  )
}
