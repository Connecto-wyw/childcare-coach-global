'use client'

import { useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

const MSG_NO_QUESTION = 'Please ask at least one question to the AI Parenting Coach.'
const MSG_NEED_SIGNIN = 'Please sign in to claim today’s reward.'
const MSG_ALREADY = 'You already claimed today’s reward.'

export default function ClaimTodayButton() {
  const user = useAuthUser()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function handleClaim() {
    if (!user) {
      // 미로그인: 팝업 + 로그인 유도
      const go = confirm(`${MSG_NEED_SIGNIN}\n\nSign in with Google now?`)
      if (go) await signInWithGoogle()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/rewards/claim', { method: 'POST' })
      const json = await res.json()

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
        alert('Something went wrong. Please try again.')
        return
      }

      alert(`Reward claimed! +${json.points_awarded} points`)
      location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="rounded-md bg-red-600 px-4 py-2 text-white disabled:opacity-60"
    >
      {loading ? 'Claiming...' : 'Claim today'}
    </button>
  )
}
