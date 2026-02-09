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
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
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
  const chatBarRef = useRef<HTMLDivElement | null>(null)

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
    setMessages((prev) => [
      ...prev,
      { id: uuid(), role, content, createdAt: Date.now() },
    ])
  }, [])

  const saveChatLog = useCallback(
    async (question: string, answer: string) => {
      if (!user) return

      const { error } = await supabase.from('chat_logs').insert({
        user_id: user.id,
        question,
        answer,
        model: 'gpt',
        lang: 'en',
      })

      if (error) {
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
        // ✅ 핵심 수정: /api/chat
        const res = await fetch('/api/chat', {
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
          throw new Error(`${res.status} ${data.error || ''}`)
        }

        const answer = (data.answer || '').trim()
        if (answer) {
          push('assistant', answer)
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

  return (
    <div className="w-full">
      <div className="space-y-3 pb-24">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] rounded-xl px-4 py-3 bg-white border border-[#dcdcdc] text-sm">
              {m.role === 'assistant' ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                <span>{m.content}</span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-white border border-[#dcdcdc] px-4 py-3 text-sm">
              Thinking{'.'.repeat(dots)}
            </div>
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 bottom-0 bg-white border-t border-[#eeeeee] p-4">
        <div className="flex gap-2">
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
            className="flex-1 bg-[#f5f5f5] px-4 py-3"
          />
          <button
            onClick={() => void ask()}
            disabled={loading || !input.trim()}
            className="w-[92px] bg-[#DA3632] text-white"
          >
            Send
          </button>
        </div>
        {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-white p-6 text-center border">
            <h3 className="text-sm font-semibold">Sign in to continue</h3>
            <button onClick={loginGoogle} className="mt-4 h-10 bg-black text-white w-full">
              Sign in
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
