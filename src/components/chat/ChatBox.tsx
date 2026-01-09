// src/components/chat/ChatBox.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
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

  const [message, setMessage] = useState('')
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
  const hasChat = messages.length > 0

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

  const push = (role: ChatRole, content: string) =>
    setMessages((p) => [...p, { id: uuid(), role, content, createdAt: Date.now() }])

  const ask = async (override?: string) => {
    const q = (override ?? message).trim()
    if (!q) return
    if (!user && guestCount >= GUEST_LIMIT) {
      setShowLoginModal(true)
      return
    }

    push('user', q)
    setLoading(true)
    setMessage('')
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
        throw new Error(`${res.status} ${data.error || ''}`)
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
    <div className="relative w-full">
      {/* messages */}
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        {/* A안: ChatBox에는 히어로/추천키워드 섹션을 넣지 않음 (coach/page.tsx에서 이미 렌더링) */}
        {!hasChat && (
          <div className="text-center text-sm text-gray-400 py-10">
            Tap a keyword above or type a question below.
          </div>
        )}

        {hasChat && (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${m.role === 'user' ? 'bg-[#2a2a2a] text-[#eae3de]' : 'bg-[#1e3a4a] text-[#eae3de]'}`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[#1e3a4a] px-4 py-3 text-sm text-[#eae3de]">
                  Thinking{'.'.repeat(dots)}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* input (sticky bottom inside this component) */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#222] bg-[#111] px-4 pb-4 pt-3">
        <div className="mx-auto flex max-w-3xl gap-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void ask()
              }
            }}
            placeholder="Type your message…"
            className="flex-1 resize-none rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm text-[#eae3de] outline-none"
            disabled={loading}
          />
          <button
            onClick={() => void ask()}
            disabled={loading || !message.trim()}
            className="rounded-xl bg-[#3EB6F1] px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>

        {!user && (
          <p className="mt-2 text-center text-xs text-gray-500">
            {guestCount}/{GUEST_LIMIT} free questions today
          </p>
        )}

        {/* 에러는 UI를 더럽히니 최소 표시만 (원하면 상세는 debug로) */}
        {error && (
          <p className="mt-1 text-center text-xs text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl bg-[#1a1a1a] p-6 text-center text-[#eae3de]">
            <h3 className="text-sm font-semibold">
              Sign in with Google to unlock unlimited access.
            </h3>
            <div className="mt-4 grid gap-2">
              <button
                onClick={loginGoogle}
                className="rounded-lg bg-white py-2 text-sm text-black"
              >
                Sign in with Google
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg border border-gray-600 py-2 text-sm"
              >
                Close
              </button>
            </div>

            {debug && (
              <pre className="mt-3 max-h-40 overflow-auto text-left text-xs text-gray-500 whitespace-pre-wrap">
                {debug}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
