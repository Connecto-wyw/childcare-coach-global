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

/* -----------------------------------------
 * ✅ "라벨" 기반 강제 출력 모드 (K_MOM_TAG 제거)
 * - KeywordButtons가 보낸 메시지(detail)가
 *   "💛 Korean Moms’ Favorite Picks" 이면
 *   API 호출 없이 하드코딩 답변을 100% 그대로 출력
 * ---------------------------------------- */
const K_MOM_USER_LABEL = '💛 Korean Moms’ Favorite Picks'

// ✅ 라벨 비교를 최대한 안 깨지게(이모지/따옴표/공백/대소문자 흡수)
function normalizeForMatch(s: string) {
  return (s ?? '')
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function isKMomLabel(text: string) {
  const n = normalizeForMatch(text).replace(/^\p{Extended_Pictographic}\s*/u, '').trim()
  const target = normalizeForMatch(K_MOM_USER_LABEL).replace(/^\p{Extended_Pictographic}\s*/u, '').trim()
  return n === target
}

// ✅ 너가 준 문구 "한 글자도 빠지지 않게" 그대로
const K_MOM_FIXED_ANSWER = `Let me share a few things that many Korean moms genuinely love.
It’s not just about what’s trending — it means more to understand why they choose them.

1️⃣ Mommy & Child Beauty Essentials

In Korea, many families are moving away from strictly separate “kids-only” products.
Instead, there is a growing preference for gentle, clean beauty items that mothers and children can safely use together.

Cushion-style sunscreen compacts make it easier for children to apply sunscreen on their own, while water-washable play cosmetics combine safety with a touch of fun.

More than the product itself, many parents value the shared experience of daily routines done together.

2️⃣ Play-Based Learning Tools

Rather than focusing heavily on memorization, Korean early education increasingly emphasizes tools that stimulate thinking through play.

Magnetic blocks paired with structured activity sheets are especially popular.
Instead of simply stacking pieces, children are guided to recreate shapes or solve simple building challenges, naturally strengthening spatial awareness and problem-solving skills.

Talking pen systems are also widely used. By touching the pages of compatible books, children can hear stories and pronunciation, making language exposure feel interactive and self-directed.

It feels less like formal studying — and more like “thinking through play.”

3️⃣ Korean Postpartum Care Starter Kit

In Korea, postpartum recovery is treated as an essential stage of care.
This starter kit focuses on:

Maintaining warmth

Gentle, steady daily recovery routines

Practical self-care that can be done at home

It is not about intensive treatment, but about creating a calm and supportive recovery environment.

4️⃣ K-Kids Silicone Tableware Set

Designed to support independent eating, this set emphasizes suction stability, food-grade silicone safety, and easy cleaning.

Korean parents often prioritize both safe materials and reducing mealtime stress.
It is a practical choice that balances functionality with clean, modern design.

If you would like to explore more trending parenting items from Korea,
👉 Visit the TEAM menu.

You can discover carefully selected, high-quality products that many Korean families already choose — offered at reasonable community-driven prices.`

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
    const id = uuid()
    setMessages((prev) => [...prev, { id, role, content, createdAt: Date.now() }])
    return id
  }, [])

  // ✅ 특정 메시지 content만 갱신 (타이핑 효과용)
  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)))
  }, [])

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  // ✅ “타이핑” 효과: fullText를 조금씩 쌓아가며 updateMessage
  const typewriterAppend = useCallback(
    async (messageId: string, fullText: string, opts?: { cps?: number; chunk?: number }) => {
      const cps = Math.max(10, opts?.cps ?? 45) // chars per second (대략적인 속도)
      const chunk = Math.max(1, opts?.chunk ?? 2) // 한 번에 추가할 문자 수
      const delay = Math.max(8, Math.floor((1000 / cps) * chunk))

      let i = 0
      while (i < fullText.length) {
        i += chunk
        const next = fullText.slice(0, i)
        updateMessage(messageId, next)
        await sleep(delay)
      }
    },
    [updateMessage]
  )

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

      // ✅ 라벨 강제 모드: Thinking → 타이핑으로 출력
      if (isKMomLabel(q)) {
        push('user', K_MOM_USER_LABEL)
        setInput('')
        setError('')

        // 1) Thinking 먼저 보여주기
        setLoading(true)

        // 2) “API 호출하는 느낌”으로 약간 대기
        await sleep(650)

        // 3) Thinking 끄고, 빈 assistant 메시지 만든 다음 타이핑 시작
        setLoading(false)

        const mid = push('assistant', '')
        // 줄바꿈/문단 유지되게 그대로 타이핑
        void typewriterAppend(mid, K_MOM_FIXED_ANSWER, { cps: 55, chunk: 2 })
        return
      }

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

        // (선택) API 답도 타이핑으로 보이게 하고 싶으면 여기서도 typewriter로 바꾸면 됨
        push('assistant', answer)
      } catch (e) {
        const msg = 'The response is delayed. Please try again.'
        setError(msg)
        push('assistant', msg)
      } finally {
        setLoading(false)
      }
    },
    [input, sessionId, push, systemPrompt, user?.id, typewriterAppend]
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
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,
                      h1: ({ children }) => <h1 className="mt-3 mb-2 text-[16px] font-semibold">{children}</h1>,
                      h2: ({ children }) => <h2 className="mt-3 mb-2 text-[16px] font-semibold">{children}</h2>,
                      h3: ({ children }) => <h3 className="mt-3 mb-2 text-[15px] font-semibold">{children}</h3>,
                      h4: ({ children }) => <h4 className="mt-3 mb-2 text-[15px] font-semibold">{children}</h4>,
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