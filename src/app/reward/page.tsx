'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

function getSiteOrigin() {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envSite) return stripTrailingSlash(envSite)
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

type ClaimRes =
  | { ok: true; points_awarded?: number; claim_date?: string }
  | { ok: false; reason: string; error?: string }

const MSG_NO_QUESTION = 'Please ask at least one question to the AI Parenting Coach.'
const MSG_ALREADY = 'You already claimed today’s reward.'
const MSG_NEED_SIGNIN = 'Please sign in to claim today’s reward.'
const MSG_UNKNOWN = 'Something went wrong. Please try again.'

export default function RewardPage() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuthUser()

  const [loadingClaim, setLoadingClaim] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const loginGoogle = useCallback(async () => {
    const base = getSiteOrigin()
    const redirectTo = `${base}/auth/callback?next=/reward`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }, [supabase])

  const handleClaim = useCallback(async () => {
    if (!user) {
      const go = confirm(`${MSG_NEED_SIGNIN}\n\nSign in with Google now?`)
      if (go) await loginGoogle()
      return
    }

    setLoadingClaim(true)
    try {
      const res = await fetch('/api/rewards/claim', { method: 'POST' })
      const json = (await res.json()) as ClaimRes

      if (!json?.ok) {
        if (json.reason === 'no_question_today') {
          alert(MSG_NO_QUESTION)
          return
        }
        if (json.reason === 'already_claimed') {
          alert(MSG_ALREADY)
          return
        }
        if (json.reason === 'not_authenticated') {
          alert(MSG_NEED_SIGNIN)
          return
        }
        alert(MSG_UNKNOWN)
        return
      }

      const add = Number(json.points_awarded ?? 0)
      setToast(add > 0 ? `✅ +${add} points` : '✅ Reward claimed')

      // ✅ NavBar 포인트 갱신
      window.dispatchEvent(new Event('points:refresh'))
    } finally {
      setLoadingClaim(false)
    }
  }, [user, loginGoogle])

  const claimButton = useMemo(() => {
    if (authLoading) {
      return (
        <button disabled className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-500">
          Loading…
        </button>
      )
    }

    if (!user) {
      return (
        <button
          onClick={loginGoogle}
          className="rounded-md bg-[#1e1e1e] px-4 py-2 text-sm font-semibold text-white"
        >
          Sign in with Google
        </button>
      )
    }

    return (
      <button
        onClick={handleClaim}
        disabled={loadingClaim}
        className="rounded-md bg-[#DA3632] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loadingClaim ? 'Claiming…' : 'Claim today'}
      </button>
    )
  }, [authLoading, user, loadingClaim, loginGoogle, handleClaim])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 토스트 */}
      {toast ? (
        <div className="sticky top-2 z-40 flex justify-center">
          <div className="px-3 py-2 bg-white border border-[#dcdcdc] text-[13px] font-semibold text-[#0e0e0e] shadow-sm">
            {toast}
          </div>
        </div>
      ) : null}

      <h1 className="text-xl font-extrabold text-[#1e1e1e]">REWARD</h1>

      <div className="mt-6 border border-[#eeeeee] bg-white p-5">
        <div className="text-[14px] font-semibold text-[#1e1e1e]">Daily Check-in</div>
        <div className="mt-2 text-[13px] text-gray-700">
          Ask 1 question on Coach each day to earn points. Complete 14 days to finish the cycle, then it restarts from Day 1.
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-[#eeeeee] p-4">
            <div className="text-[13px] font-semibold">Rewards</div>
            <div className="mt-2 text-[13px] text-gray-700 leading-6">
              Day 1–6: 100p/day<br />
              Day 7: 300p<br />
              Day 8–13: 100p/day<br />
              Day 14: 600p
            </div>
          </div>

          <div className="border border-[#eeeeee] p-4">
            <div className="text-[13px] font-semibold">Rule</div>
            <div className="mt-2 text-[13px] text-gray-700 leading-6">
              One claim per day.<br />
              Missing a day resets streak to Day 1.<br />
              Points are added to your balance.
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#eeeeee] pt-4">
          <div className="text-[13px] text-gray-700">
            <div className="font-semibold text-[#1e1e1e]">My Reward</div>
            <div className="mt-1">
              * Claim today is available after you ask at least 1 question on the Coach.
            </div>
          </div>

          {claimButton}
        </div>
      </div>
    </div>
  )
}
