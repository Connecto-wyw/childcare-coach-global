// src/components/chat/ChatBox.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuthUser, useSupabase } from '@/app/providers'
import { googleSignInWithSelectAccount } from '@/lib/googleSignIn'

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
 * ---------------------------------------- */
const K_MOM_USER_LABEL = '💛 Korean Moms’ Favorite Picks'

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
const K_MOM_FIXED_ANSWER = `Hello—I'm your AI Parenting Coach.

Let me share a few things that many Korean moms genuinely love.
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

// ✅ 로그인 유도 후, 돌아왔을 때 재실행할 “대기 액션” 저장 키
const PENDING_KEY = 'cc_pending_action'
type PendingAction = { type: 'ask'; text: string }

function setPending(action: PendingAction) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(action))
  } catch {}
}

function getPending(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingAction
  } catch {
    return null
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {}
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

  // ✅ 로그인 요구 모달
  const [showLoginModal, setShowLoginModal] = useState(false)

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

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)))
  }, [])

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  const typewriterAppend = useCallback(
    async (messageId: string, fullText: string, opts?: { cps?: number; chunk?: number }) => {
      const cps = Math.max(10, opts?.cps ?? 45)
      const chunk = Math.max(1, opts?.chunk ?? 2)
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

  // ✅ 로그인 필요하면 모달 띄우고, pending 저장
  const requireLoginThen = useCallback(
    (textToAsk: string) => {
      setPending({ type: 'ask', text: textToAsk })
      setShowLoginModal(true)
    },
    []
  )

  // ✅ “로그인 체크 + 실행”
  const guardedAsk = useCallback(
    async (override?: string) => {
      const q = (override ?? input).trim()
      if (!q) return

      // ✅ 여기에서 강제: 게스트면 모달
      if (!user?.id) {
        requireLoginThen(q)
        return
      }

      // 로그인 유저면 정상 실행
      await ask(q)
    },
    // ask는 아래에서 선언되지만, useCallback으로 안전하게 연결하려면 eslint 끄거나 순서 조정 필요.
    // 여기서는 TS/React가 문제 없이 처리하는 패턴(아래 ask가 const로 정의)로 맞춰둠.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, user?.id, requireLoginThen]
  )

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

        setLoading(true)
        await sleep(650)
        setLoading(false)

        const mid = push('assistant', '')
        void typewriterAppend(mid, K_MOM_FIXED_ANSWER, { cps: 75, chunk: 3 })
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
            sessionId: sid,
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

        if (okJson?.sessionId && okJson.sessionId !== sid) {
          try {
            window.localStorage.setItem(SESSION_KEY, okJson.sessionId)
            setSessionId(okJson.sessionId)
          } catch {}
        }

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
    [input, sessionId, push, systemPrompt, user?.id, typewriterAppend]
  )

  // ✅ 로그인 성공 후 /coach 로 돌아왔을 때 pending 자동 실행
  useEffect(() => {
    if (!user?.id) return
    if (loading) return

    const p = getPending()
    if (!p) return

    // 중복 실행 방지: 먼저 지우고 실행
    clearPending()

    // pending 질문 실행
    void ask(p.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ✅ 프리셋 클릭 이벤트도 로그인 강제
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      const q = (text ?? '').trim()
      if (!q) return

      setInput(q)
      if (loading) return

      // ✅ 여기 중요: 바로 ask(q) 하지 말고 guardedAsk(q)
      void guardedAsk(q)
    }

    window.addEventListener('coach:setMessage', handler as EventListener)
    return () => window.removeEventListener('coach:setMessage', handler as EventListener)
  }, [loading, guardedAsk])

  // ✅ 모달 OK: 구글 로그인 시작
  const onModalOk = useCallback(async () => {
    setShowLoginModal(false)
    try {
      await googleSignInWithSelectAccount(supabase as any)
    } catch (e) {
      console.error('[googleSignInWithSelectAccount] error:', e)
      // 실패하면 pending은 남아있으니 사용자가 다시 시도 가능
      setError('Unable to start Google sign-in. Please try again.')
    }
  }, [supabase])

  const onModalCancel = useCallback(() => {
    setShowLoginModal(false)
    clearPending()
  }, [])

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
          <div className="border-2 border-[#9F1D23] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#9F1D23] focus-within:ring-offset-2">
            <div className="flex items-stretch gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void guardedAsk()
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
                  'placeholder:text-[#9F1D23] placeholder:opacity-60 placeholder:font-normal',
                  'leading-[24px]',
                ].join(' ')}
              />
              <button
                onClick={() => void guardedAsk()}
                disabled={loading || !input.trim()}
                className={[
                  'w-[92px]',
                  'bg-[#9F1D23] text-white',
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

      {/* ✅ 로그인 요구 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={onModalCancel} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl border border-[#e5e5e5]">
            <div className="px-5 py-4 border-b border-[#eeeeee]">
              <p className="text-[16px] font-semibold text-[#0e0e0e]">Google sign-in required</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[14px] leading-relaxed text-[#222222]">
                Please sign in with Google to continue.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-[#eeeeee] flex justify-end gap-2">
              <button
                type="button"
                onClick={onModalCancel}
                className="rounded-lg px-4 py-2 text-[14px] font-medium border border-[#d0d0d0] bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onModalOk}
                className="rounded-lg px-4 py-2 text-[14px] font-semibold bg-black text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* loginGoogle 함수는 유지(다른 UI에서 재사용 가능) */}
    </div>
  )
}