// src/components/chat/ChatBox.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

  // ✅ 플로팅 입력창 높이 측정용 ref
  const chatBarRef = useRef<HTMLDivElement | null>(null)

  // ✅ 첫 마운트 때 scrollIntoView 방지
  const didMountRef = useRef(false)
  const prevMsgLenRef = useRef(0)

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

  // ✅ 고정 입력창 높이를 CSS 변수로 저장: --chatbar-h
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

  // ✅ 스크롤 끌림 원인 제거
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

  /**
   * ✅ 핵심 추가: 질문/답변을 chat_logs에 저장
   * - reward RPC는 Reward 페이지에서 Claim today 누를 때 처리하므로 여기서는 저장만 한다.
   * - RLS 정책이 있어야 insert가 성공한다. (auth.uid() = user_id)
   */
  const saveChatLog = useCallback(
    async (question: string, answer: string) => {
      if (!user) return

      // 모델/언어는 너 테이블 컬럼에 맞게 적당히 채우기
      const model = 'gpt' // 필요하면 /api/ask 응답에 model 내려서 넣어도 됨
      const lang = 'en' // 글로벌 버전이면 en, 한국이면 ko 등으로 바꿔도 됨

      const { error } = await supabase.from('chat_logs').insert({
        user_id: user.id,
        question,
        answer,
        model,
        lang,
      })

      if (error) {
        // RLS 정책 없거나, insert 권한 막혀있으면 여기로 떨어짐
        console.error('[chat_logs insert] error:', error)
        setDebug(`[chat_logs insert] ${error.message}`)
      }
    },
    [supabase, user]
  )

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
        if (answer) {
          push('assistant', answer)

          // ✅ 여기서 DB 저장 (이게 있어야 "오늘 질문 했는지" 판별 가능)
          await saveChatLog(q, answer)
        }
      } catch (e) {
        const msg = 'The response is delayed. Please try again.'
        setError(msg)
        setDebug(String(e))
        push('assistant', msg)
      } finally {
        setLoading(false)
      }
    },
    [input, user, push, systemPrompt, saveChatLog]
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
      {/* ✅ 메시지는 페이지에 그대로 쌓이되, 하단은 "플로팅 입력창 높이"만큼 자동 확보 */}
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

      {/* ✅ 입력창: "아예 이 영역은 흰색 바닥"으로 깔고, 페이지가 그 높이만큼 자동 비움 */}
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
