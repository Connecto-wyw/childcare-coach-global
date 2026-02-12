// src/components/chat/ChatBox.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import ReactMarkdown from 'react-markdown'

type ChatBoxProps = { systemPrompt?: string }
type AskRes = { answer?: string; error?: string; message?: string; status?: number; body?: string }

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => resolve(), ms)
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          reject(new DOMException('Aborted', 'AbortError'))
        },
        { once: true }
      )
    }
  })
}

/** 하드코딩/응답 텍스트를 "타이핑"처럼 출력 */
async function typewrite(opts: {
  text: string
  onStart?: () => void
  onChunk: (chunk: string) => void
  onDone?: () => void
  onError?: (err: unknown) => void
  signal?: AbortSignal
  initialDelayMs?: number // Thinking... 유지 시간
  chunkSize?: number
  chunkDelayMs?: number
}) {
  const {
    text,
    onStart,
    onChunk,
    onDone,
    onError,
    signal,
    initialDelayMs = 450,
    chunkSize = 8,
    chunkDelayMs = 16,
  } = opts

  try {
    onStart?.()
    if (initialDelayMs > 0) await sleep(initialDelayMs, signal)

    for (let i = 0; i < text.length; i += chunkSize) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      onChunk(text.slice(i, i + chunkSize))
      await sleep(chunkDelayMs, signal)
    }

    onDone?.()
  } catch (err) {
    if ((err as any)?.name === 'AbortError') return
    onError?.(err)
  }
}

export default function ChatBox({ systemPrompt }: ChatBoxProps) {
  const user = useUser()
  const supabase = useSupabaseClient()

  const [message, setMessage] = useState('')

  // ✅ reply를 "한 번에" 꽂지 않고, 타이핑으로 누적 출력할 거라서 두 상태로 분리
  const [reply, setReply] = useState('') // 화면에 보여줄 최종/누적 reply
  const [thinking, setThinking] = useState(false) // "Thinking..." 노출용

  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const [loading, setLoading] = useState(false)

  // ⬇️ 로딩 점 애니메이션용 상태
  const [dots, setDots] = useState(0)

  // 게스트 2회 제한
  const [guestCount, setGuestCount] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const LS_KEY = 'guest_q_count'
  const LS_DAY = 'guest_q_day'
  const GUEST_LIMIT = 2
  const today = () => new Date().toISOString().slice(0, 10)

  // ✅ 타이핑(스트리밍) 중단용
  const typingAbortRef = useRef<AbortController | null>(null)

  // ✅ 프리셋(하드코딩) 답변: 여기만 원하는 문구로 계속 늘리면 됨
  const PRESETS: Record<string, string> = {
    "💛 Korean Moms’ Favorite Picks": `Let me share a few things that many Korean moms genuinely love.
It’s not just about what's trending — it means more to understand why they choose them.

1️⃣ Mommy & Child Beauty Essentials
In Korea, many families are moving away from strictly separate "kids-only" products.
Instead, there is a growing preference for gentle, clean beauty items that mothers and children can safely use together.

2️⃣ Playful Learning Tools
Rather than rote memorization, parents prefer playful tools that spark thinking — blocks, activity books, speaking pens, and hands-on kits.

3️⃣ Simple Home Routines
Small daily rituals (meal rhythm, bedtime routines, short tidy-up games) are chosen because they reduce conflict and increase cooperation.`,
  }

  const stopTyping = () => {
    typingAbortRef.current?.abort()
    typingAbortRef.current = null
  }

  const startTypingReply = async (text: string) => {
    stopTyping()
    const ac = new AbortController()
    typingAbortRef.current = ac

    setReply('')
    setThinking(true)

    await typewrite({
      text,
      signal: ac.signal,
      initialDelayMs: 450, // Thinking... 잠깐 보여주기
      chunkSize: 8,
      chunkDelayMs: 16,
      onStart: () => {
        // 이미 setThinking(true) 해둠
      },
      onChunk: (chunk) => {
        setThinking(false) // 첫 chunk부터 Thinking 숨김
        setReply((prev) => prev + chunk)
      },
      onDone: () => {
        setThinking(false)
      },
      onError: (err) => {
        setThinking(false)
        setError('응답 표시 중 문제가 발생했습니다. 다시 시도해 주세요.')
        setDebug(String(err))
      },
    })
  }

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

  // 키워드 → 입력창 자동 채우기
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setMessage(text ?? '')
    }
    window.addEventListener('coach:setMessage', handler as EventListener)
    return () => window.removeEventListener('coach:setMessage', handler as EventListener)
  }, [])

  // ✅ 프리셋 버튼 클릭 → "바로 출력" 이벤트도 지원 (원하면 너희 버튼에서 이 이벤트만 쏘면 됨)
  // window.dispatchEvent(new CustomEvent('coach:showPreset', { detail: "💛 Korean Moms’ Favorite Picks" }))
  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent<string>).detail
      const preset = PRESETS[key]
      if (!preset) return

      // 프리셋은 게스트 제한에 포함할지 말지 선택인데,
      // "질문" 경험과 동일하게 제한에 포함시키고 싶으면 아래 로직을 살려.
      if (!user && guestCount >= GUEST_LIMIT) {
        setShowLoginModal(true)
        return
      }

      setLoading(false)
      setError('')
      setDebug('')

      void startTypingReply(preset)

      if (!user) bumpGuest()
      setMessage('')
    }

    window.addEventListener('coach:showPreset', handler as EventListener)
    return () => window.removeEventListener('coach:showPreset', handler as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, guestCount])

  // 로그인 완료되면 모달 닫기
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setShowLoginModal(false)
    })
    return () => data.subscription.unsubscribe()
  }, [supabase])

  // ⬇️ 로딩 중 버튼 "함께 고민 중..." 점 애니메이션
  useEffect(() => {
    if (!loading) {
      setDots(0)
      return
    }
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400)
    return () => clearInterval(id)
  }, [loading])

  const bumpGuest = () => {
    const next = guestCount + 1
    setGuestCount(next)
    localStorage.setItem(LS_KEY, String(next))
    localStorage.setItem(LS_DAY, today())
  }

  const loginKakao = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${origin}/auth/callback?next=/coach` },
    })
  }

  const ask = async () => {
    const q = message.trim()
    if (!q) return
    if (!user && guestCount >= GUEST_LIMIT) {
      setShowLoginModal(true)
      return
    }

    // ✅ 이전 타이핑 중이면 중단
    stopTyping()

    setLoading(true)
    setError('')
    setDebug('')
    setReply('')
    setThinking(false)

    // ✅ 1) (선택) 질문이 프리셋 키랑 같으면 API 안 타고 바로 "Thinking+타이핑"으로 출력
    // - 만약 버튼이 "프리셋 클릭 즉시 출력"이라면 위의 coach:showPreset 이벤트를 쓰면 되고,
    // - "입력창에 채우고 질문하기 눌렀을 때도" 같은 UX를 원하면 아래를 유지하면 됨.
    if (PRESETS[q]) {
      setLoading(false)
      setError('')
      setDebug('')
      void startTypingReply(PRESETS[q])
      if (!user) bumpGuest()
      setMessage('')
      return
    }

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt ?? '', question: q, user_id: user?.id ?? null }),
        cache: 'no-store',
      })

      const raw = await res.text()
      let data: AskRes = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {}

      if (!res.ok) {
        if (res.status === 403) setShowLoginModal(true)
        const friendly = '일시적으로 응답이 지연되었어요. 잠시 후 다시 시도해 주세요.'
        const tech = `${res.status} ${res.statusText} ${data.error || ''} ${(data.body || '').slice(0, 500)}`
        setError(friendly)
        setDebug(tech.trim())
        return
      }

      const ans = (data.answer || '').trim()

      // ✅ 2) API 응답도 “한 번에 꽂지 말고” 타이핑으로 출력 (원하면 이 라인만 setReply로 바꿔도 됨)
      await startTypingReply(ans)

      if (!user) bumpGuest()
      setMessage('')
    } catch (e) {
      setError('네트워크 상태가 불안정합니다. 다시 시도해 주세요.')
      setDebug(String(e))
    } finally {
      setLoading(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void ask()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* 입력 영역 */}
      <div className="mt-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onEnter}
          placeholder="요즘 육아 고민을 AI 육아코치에게 질문해보세요."
          className="w-full min-h-[120px] rounded-md border border-gray-600 bg-[#111] text-[#eae3de] px-3 py-3 outline-none"
          disabled={loading}
        />
        <div className="flex items-center justify-center mt-3">
          <button
            onClick={ask}
            disabled={loading}
            className="h-10 rounded-md bg-[#3EB6F1] text-white px-8 text-base hover:bg-[#299ed9] disabled:opacity-60"
          >
            {loading ? `함께 고민 중${'.'.repeat(dots)}` : '질문하기'}
          </button>
        </div>

        {/* 게스트 무료 횟수 표시 */}
        {!user && (
          <p className="mt-1 text-xs text-gray-400 text-center">
            오늘 {guestCount}/{GUEST_LIMIT}개 질문 사용
          </p>
        )}

        {error && (
          <div className="mt-3 text-sm">
            <div className="rounded-md bg-[#422] text-[#fbb] p-2 text-center">{error}</div>
            {debug && (
              <details className="mt-2 text-xs text-gray-400">
                <summary>자세히</summary>
                <pre className="whitespace-pre-wrap">{debug}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* 응답 */}
      {(thinking || reply) && (
        <div className="mt-6 rounded-2xl border border-gray-700 p-4 text-[#eae3de] prose prose-invert max-w-none leading-7 space-y-3">
          {/* ✅ Thinking... */}
          {thinking && <div className="text-xs text-gray-400 mb-2">Thinking...</div>}

          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
            }}
          >
            {reply}
          </ReactMarkdown>
        </div>
      )}

      {/* 게스트 초과 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-[#191919] p-6 text-center">
            <h3 className="text-base font-semibold text-[#eae3de]">
              카카오톡 로그인하고 <br /> AI육아코치 무제한으로 사용하세요.
            </h3>
            <div className="mt-5 grid gap-2">
              <button
                onClick={loginKakao}
                className="rounded-lg bg-[#FEE500] py-2.5 text-sm font-medium text-black hover:bg-[#F2D000] transition"
              >
                카카오로 2초 로그인
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg border border-gray-600 py-2.5 text-sm text-[#eae3de] hover:bg-gray-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}