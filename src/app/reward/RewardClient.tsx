// src/app/reward/RewardClient.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

type ClaimApiResponse =
  | {
      ok: true
      points_added: number
      cycle_pos: number
      streak_total: number
    }
  | {
      ok: false
      reason:
        | 'not_authenticated'
        | 'no_question_today'
        | 'already_claimed'
        | 'db_error'
        | 'unknown'
      error?: string
    }

type ClaimState =
  | { type: 'idle' }
  | { type: 'ok'; pointsAdded: number; cyclePos: number; streakTotal: number }
  | { type: 'already_claimed' }
  | { type: 'no_question_today' }
  | { type: 'not_authenticated' }
  | { type: 'http_error'; status: number; message: string }
  | { type: 'network_error'; message: string }

function format(n: number) {
  try {
    return n.toLocaleString('en-US')
  } catch {
    return String(n)
  }
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

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

export default function RewardClient() {
  const { user } = useAuthUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)

  // 상태 표시(빨간 Status error 등)
  const [claimState, setClaimState] = useState<ClaimState>({ type: 'idle' })

  // 내 포인트/스트릭 표시
  const [myPoints, setMyPoints] = useState<number | null>(null)
  const [myStreak, setMyStreak] = useState<number | null>(null)

  // 안내 모달(너 스샷의 Action required 같은거)
  const [modal, setModal] = useState<{ open: boolean; title: string; body: string }>({
    open: false,
    title: '',
    body: '',
  })

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (user) setShowLoginModal(false)
  }, [user])

  const getAuthRedirectTo = useCallback(() => {
    const base = getSiteOrigin()
    return `${base}/auth/callback?next=/reward`
  }, [])

  const loginGoogle = useCallback(async () => {
    const redirectTo = getAuthRedirectTo()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }, [supabase, getAuthRedirectTo])

  const loadMySummary = useCallback(async () => {
    if (!user) {
      setMyPoints(null)
      setMyStreak(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('points, reward_streak')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[profiles summary] error:', error)
      return
    }

    setMyPoints(Number((data as any)?.points ?? 0))
    setMyStreak(Number((data as any)?.reward_streak ?? 0))
  }, [supabase, user])

  useEffect(() => {
    void loadMySummary()
  }, [loadMySummary])

  const onClaim = useCallback(async () => {
    // ✅ 액션할 때만 로그인 요구
    if (!user) {
      setShowLoginModal(true)
      return
    }

    setClaimState({ type: 'idle' }) // ✅ 이전 http_error 등 초기화
    setLoading(true)

    try {
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      const json = (await safeJson(res)) as any

      // ✅ 진짜 HTTP 에러(401/500)만 에러로 표시
      if (!res.ok) {
        const reason = String(json?.reason ?? '')
        if (res.status === 401 || reason === 'not_authenticated') {
          setClaimState({ type: 'not_authenticated' })
          setModal({
            open: true,
            title: 'Login required',
            body: 'Please login and try again.',
          })
          return
        }

        setClaimState({
          type: 'http_error',
          status: res.status,
          message: String(json?.error ?? json?.reason ?? 'http_error'),
        })
        setModal({
          open: true,
          title: 'Error',
          body: 'Something went wrong. Please try again.',
        })
        return
      }

      // ✅ 여기부터는 HTTP 200
      const payload = json as ClaimApiResponse

      if (payload?.ok === true) {
        const add = Number(payload.points_added ?? 0)
        const streakTotal = Number(payload.streak_total ?? 0)

        setClaimState({
          type: 'ok',
          pointsAdded: add,
          cyclePos: Number(payload.cycle_pos ?? 1),
          streakTotal,
        })

        // UI 즉시 반영
        setMyStreak(streakTotal)
        setMyPoints((prev) => (prev ?? 0) + add)

        // NavBar 포인트 갱신 이벤트(이미 쓰는 구조면 유지)
        window.dispatchEvent(new Event('points:refresh'))

        setToast(add > 0 ? `✅ +${add}p (Streak ${streakTotal})` : '✅ Checked in')
        return
      }

      // ✅ ok:false는 "안내" (에러 텍스트 찍지 말 것)
      const reason = String((payload as any)?.reason ?? '')

      if (reason === 'already_claimed') {
        setClaimState({ type: 'already_claimed' })
        setModal({
          open: true,
          title: 'Already claimed',
          body: 'You already claimed today.',
        })
        return
      }

      if (reason === 'no_question_today') {
        setClaimState({ type: 'no_question_today' })
        setModal({
          open: true,
          title: 'Action required',
          body: 'Please ask at least one question in the AI Parenting Coach and then claim.',
        })
        return
      }

      if (reason === 'not_authenticated') {
        setClaimState({ type: 'not_authenticated' })
        setModal({
          open: true,
          title: 'Login required',
          body: 'Please login and try again.',
        })
        return
      }

      // 그 외 예외
      setClaimState({ type: 'http_error', status: 200, message: reason || 'unknown' })
      setModal({
        open: true,
        title: 'Error',
        body: 'Something went wrong. Please try again.',
      })
    } catch (e: any) {
      setClaimState({ type: 'network_error', message: String(e?.message ?? e) })
      setModal({
        open: true,
        title: 'Error',
        body: 'Network error. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  const summaryText = useMemo(() => {
    if (!user) return null
    const s = myStreak ?? 0
    const p = myPoints ?? 0
    return `Streak: ${s} days · Points: ${format(p)}`
  }, [user, myPoints, myStreak])

  return (
    <div className="w-full">
      {toast && (
        <div className="mb-3 flex justify-center">
          <div className="px-3 py-2 bg-white border border-[#dcdcdc] text-[13px] font-semibold text-[#0e0e0e] shadow-sm">
            {toast}
          </div>
        </div>
      )}

      {/* ✅ 빨간 Status error는 진짜 에러일 때만 */}
      {(claimState.type === 'http_error' || claimState.type === 'network_error') && (
        <div className="mb-2 text-right text-[13px] text-red-600">
          Status error:{' '}
          {claimState.type === 'http_error'
            ? `http_error (${claimState.status})`
            : 'network_error'}
        </div>
      )}

      <div className="border border-[#dcdcdc] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">My Reward</div>
            <div className="mt-1 text-[13px] text-gray-700">
              {summaryText ?? 'Sign in to track your streak and points.'}
            </div>
          </div>

          <button
            onClick={onClaim}
            disabled={loading}
            className={[
              'h-10 px-4',
              'bg-[#DA3632] text-white',
              'text-[13px] font-semibold',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? 'Checking…' : 'Claim today'}
          </button>
        </div>

        <p className="mt-3 text-[12px] text-gray-500 leading-relaxed">
          * Claim today is available after you ask at least 1 question on the Coach.
          <br />
          * If you click without signing in, you’ll be asked to sign in.
        </p>
      </div>

      {/* ✅ 안내/에러 모달 */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-white p-6 text-[#0e0e0e] border border-[#dcdcdc]">
            <h3 className="text-[14px] font-semibold">{modal.title}</h3>
            <p className="mt-2 text-[13px] text-gray-700 whitespace-pre-line">{modal.body}</p>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setModal({ open: false, title: '', body: '' })}
                className="h-9 px-4 bg-[#1e1e1e] text-white text-[13px] font-semibold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 로그인 요구 팝업 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-white p-6 text-center text-[#0e0e0e] border border-[#dcdcdc]">
            <h3 className="text-[13px] font-semibold text-[#1e1e1e]">Sign in required</h3>
            <p className="mt-2 text-[13px] text-gray-700">
              You need to sign in to use this feature.
            </p>

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
          </div>
        </div>
      )}
    </div>
  )
}
