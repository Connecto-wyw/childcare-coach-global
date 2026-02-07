// src/components/rewards/ClaimTodayButton.tsx  (파일명은 너 프로젝트 구조에 맞춰)
// 또는 기존 파일 그대로 덮어쓰기

'use client'

import { useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

const MSG_NO_QUESTION = 'Please ask at least one question in the AI Parenting Coach and then claim.'
const MSG_NEED_SIGNIN = 'Please sign in to claim today’s reward.'
const MSG_ALREADY = 'You already claimed today’s reward.'

type ClaimResponse =
  | { ok: true; points_added: number; cycle_pos: number; streak_total: number }
  | { ok: false; reason: string; error?: string }

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

function getSiteOrigin() {
  const envSite = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envSite) return stripTrailingSlash(envSite)
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export default function ClaimTodayButton() {
  const { user, loading: authLoading } = useAuthUser()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    const base = getSiteOrigin() || location.origin
    // ✅ 로그인 후 reward로 돌아오게 next 지정
    const redirectTo = `${base}/auth/callback?next=/reward`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  async function handleClaim() {
    // ✅ auth 로딩 중이면 클릭 방지
    if (authLoading) return

    if (!user) {
      const go = confirm(`${MSG_NEED_SIGNIN}\n\nSign in with Google now?`)
      if (go) await signInWithGoogle()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/rewards/claim', { method: 'POST' })

      let json: ClaimResponse | null = null
      try {
        json = (await res.json()) as ClaimResponse
      } catch {
        json = null
      }

      // ✅ HTTP 자체가 실패(500 등)면 서버가 준 에러를 최대한 보여주기
      if (!res.ok) {
        const msg =
          (json as any)?.error ||
          (json as any)?.reason ||
          `HTTP ${res.status}`
        alert(`Something went wrong. Please try again.\n\n${msg}`)
        return
      }

      if (!json || json.ok !== true) {
        const reason = (json as any)?.reason

        if (reason === 'no_question_today') {
          alert(MSG_NO_QUESTION)
          return
        }
        if (reason === 'already_claimed') {
          alert(MSG_ALREADY)
          return
        }
        if (reason === 'not_authenticated') {
          alert(MSG_NEED_SIGNIN)
          return
        }

        // ✅ reason/error가 있으면 그대로 출력 (디버깅에 중요)
        const extra = (json as any)?.error ? `\n\n${(json as any).error}` : ''
        alert(`Something went wrong. Please try again.${extra}`)
        return
      }

      alert(`Reward claimed! +${json.points_added} points`)
      location.reload()
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || authLoading

  return (
    <button
      onClick={handleClaim}
      disabled={disabled}
      className="rounded-md bg-red-600 px-4 py-2 text-white disabled:opacity-60"
    >
      {authLoading ? 'Loading...' : loading ? 'Claiming...' : 'Claim today'}
    </button>
  )
}
