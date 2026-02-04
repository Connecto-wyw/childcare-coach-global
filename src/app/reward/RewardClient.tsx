// src/app/reward/RewardClient.tsx
'use client'


import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

type ClaimDailyRewardResult = {
  claimed?: boolean
  today?: string
  streak?: number
  awarded_points?: number
  total_points?: number
}

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

export default function RewardClient() {
  const { user } = useAuthUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)

  // (선택) 로그인 상태에서만 내 포인트/스트릭을 가볍게 보여주고 싶으면
  const [myPoints, setMyPoints] = useState<number | null>(null)
  const [myStreak, setMyStreak] = useState<number | null>(null)

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
    // ✅ 액션할 때만 로그인 요구 (영어 팝업)
    if (!user) {
      setShowLoginModal(true)
      return
    }

    setLoading(true)
    try {
      // 타입 갱신이 되어있으면 supabase.rpc('claim_daily_reward')로 바꿔도 됨.
      const { data, error } = await (supabase as any).rpc('claim_daily_reward')

      if (error) {
        console.error('[claim_daily_reward] error:', error)
        setToast('Something went wrong. Please try again.')
        return
      }

      const payload = (data ?? {}) as ClaimDailyRewardResult

      if (payload.claimed) {
        const add = Number(payload.awarded_points ?? 0)
        const streak = Number(payload.streak ?? 0)
        const total = Number(payload.total_points ?? 0)

        setMyStreak(streak)
        setMyPoints(total)

        // NavBar 포인트 갱신 이벤트(이미 구현해둔 구조라면)
        window.dispatchEvent(new Event('points:refresh'))

        setToast(add > 0 ? `✅ +${add}p (Day ${streak})` : '✅ Checked in')
      } else {
        setToast('You have already claimed today.')
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

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

      {/* ✅ 로그인 요구 팝업 (영어) */}
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
