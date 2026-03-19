// src/components/chat/ChatBox.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuthUser } from '@/app/providers'
import { useTranslation } from '@/i18n/I18nProvider'

type ChatBoxProps = { systemPrompt?: string; initialPrefill?: string; hasKYK?: boolean }
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

const NO_KYK_LIMIT = 2
const NO_KYK_STORAGE_KEY = 'no_kyk_qs'

function getTodayNoKYKCount(): number {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem(NO_KYK_STORAGE_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return parsed.date === today ? (parsed.count ?? 0) : 0
  } catch {
    return 0
  }
}

function incrementTodayNoKYKCount() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const count = getTodayNoKYKCount() + 1
    localStorage.setItem(NO_KYK_STORAGE_KEY, JSON.stringify({ date: today, count }))
    return count
  } catch {
    return 1
  }
}

export default function ChatBox({ systemPrompt, initialPrefill, hasKYK = true }: ChatBoxProps) {
  // ✅ user는 "있으면 쓰고, 없어도 OK"
  const { user } = useAuthUser()
  const t = useTranslation('coach')

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [dots, setDots] = useState(0)

  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState('')

  // KYK 모달 상태
  const [showKYKModal, setShowKYKModal] = useState(false)
  const [skippedKYK, setSkippedKYK] = useState(false)
  const [noKYKCount, setNoKYKCount] = useState(0)
  // 모달 dismiss 후 바로 질문할 수 있도록 pendingQuestion 저장
  const pendingQuestionRef = useRef<string | null>(null)

  const endRef = useRef<HTMLDivElement | null>(null)
  const chatBarRef = useRef<HTMLDivElement | null>(null)

  const didMountRef = useRef(false)
  const prefillFiredRef = useRef(false)
  const prevMsgLenRef = useRef(0)

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  useEffect(() => {
    if (!hasKYK) {
      const count = getTodayNoKYKCount()
      setNoKYKCount(count)
      if (count > 0) setSkippedKYK(true)
    }
  }, [hasKYK])

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

  const ask = useCallback(
    async (override?: string) => {
      const q = (override ?? input).trim()
      if (!q) return

      // KYK 없는 유저: 모달 먼저 표시
      if (!hasKYK && !skippedKYK) {
        pendingQuestionRef.current = q
        setShowKYKModal(true)
        return
      }

      // KYK 없는 유저: 일일 제한 체크
      if (!hasKYK && noKYKCount >= NO_KYK_LIMIT) {
        push('assistant', t('kyk_limit_reached'))
        return
      }

      const sid = sessionId || getOrCreateSessionId()

      // ✅ 라벨 강제 모드: Thinking → 타이핑으로 출력 (서버 호출 없이)
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
          if (res.status === 429 && (errJson as any)?.error === 'kyk_limit_reached') {
            push('assistant', t('kyk_limit_reached'))
            return
          }
          const rid = errJson?.requestId ? ` (requestId: ${errJson.requestId})` : ''
          const core = `Error ${res.status}${rid}\n\n${errJson?.error || errJson?.message || 'api/chat failed'}`
          setError(core)
          push('assistant', core)
          return
        }

        const okJson = await safeJsonParse<ApiChatOk>(raw)
        const answer = (okJson?.answer || '').trim()

        // ✅ 서버가 세션ID를 새로 내려주면 로컬에도 반영
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
          const msg = `${t('chat_error_empty')}${rid}`
          setError(msg)
          push('assistant', msg)
          return
        }

        push('assistant', answer)

        // KYK 없는 유저 질문 카운트 증가
        if (!hasKYK) {
          const newCount = incrementTodayNoKYKCount()
          setNoKYKCount(newCount)
        }
      } catch {
        const msg = t('chat_error_delayed')
        setError(msg)
        push('assistant', msg)
      } finally {
        setLoading(false)
      }
    },
    [input, sessionId, push, systemPrompt, user?.id, typewriterAppend, hasKYK, skippedKYK, noKYKCount]
  )

  // ✅ Auto-Submit Prefill Once
  useEffect(() => {
    if (initialPrefill && !prefillFiredRef.current && initialPrefill.trim() !== '') {
      prefillFiredRef.current = true
      
      // Auto trigger the ask function. Wait a tiny bit for UI to settle.
      setTimeout(() => {
        ask(initialPrefill)
        
        // Clean up the URL to prevent refresh double submits
        try {
          const url = new URL(window.location.href)
          url.searchParams.delete('prefill')
          window.history.replaceState({}, '', url.toString())
        } catch {}
      }, 300)
    }
  }, [initialPrefill, ask])

  // ✅ 프리셋/키워드 클릭 이벤트: 로그인 없이도 즉시 질문 실행
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
      {/* KYK 유도 모달 */}
      {showKYKModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-[15px] font-semibold text-[#0e0e0e] leading-relaxed text-center">
              {t('kyk_modal_desc')}
            </p>
            <p className="mt-2 text-[13px] text-gray-400 text-center">
              {t('kyk_modal_limit').replace('{limit}', String(NO_KYK_LIMIT))}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href="/kyk"
                className="w-full rounded-xl bg-[#9F1D23] py-3 text-center text-[15px] font-bold text-white"
              >
                {t('kyk_modal_btn_kyk')}
              </a>
              <button
                onClick={() => {
                  setSkippedKYK(true)
                  setShowKYKModal(false)
                  const pending = pendingQuestionRef.current
                  pendingQuestionRef.current = null
                  if (pending) setTimeout(() => ask(pending), 50)
                }}
                className="w-full rounded-xl border border-gray-200 py-3 text-[15px] font-medium text-gray-600"
              >
                {t('kyk_modal_btn_skip').replace('{limit}', String(NO_KYK_LIMIT))}
              </button>
            </div>
          </div>
        </div>
      )}
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
              {t('chat_thinking')}{'.'.repeat(dots)}
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
                    void ask()
                  }
                }}
                placeholder={t('chat_placeholder')}
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
                onClick={() => void ask()}
                disabled={loading || !input.trim()}
                className={[
                  'w-[92px]',
                  'bg-[#9F1D23] text-white',
                  'text-[15px] font-semibold',
                  'cursor-pointer',
                  'disabled:cursor-not-allowed',
                ].join(' ')}
              >
                {t('chat_send')}
              </button>
            </div>
          </div>

          {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}