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

type StatusRes =
  | { ok: true; today: string; claimed_today: boolean; streak: number; board: boolean[] }
  | { ok: false; reason: string; error?: string }

const MSG_SUCCESS = "Today's reward has been granted."
const MSG_NO_QUESTION = 'Please ask at least one question in the AI Parenting Coach and then claim.'
const MSG_ALREADY = "You've already claimed today's reward."
const MSG_NEED_SIGNIN = 'Please sign in to claim today’s reward.'
const MSG_UNKNOWN = 'Something went wrong. Please try again.'

const REWARDS = [
  100, 100, 100, 100, 100, 100, // Day1-6
  300, // Day7
  100, 100, 100, 100, 100, 100, // Day8-13
  600, // Day14
]

function Modal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white border border-[#dcdcdc] p-5">
        <div className="text-[14px] font-extrabold text-[#1e1e1e]">{title}</div>
        <div className="mt-2 text-[13px] text-gray-700 whitespace-pre-wrap">{message}</div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md bg-[#1e1e1e] text-white text-[13px] font-semibold"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RewardPage() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuthUser()

  const [loadingClaim, setLoadingClaim] = useState(false)

  // 상태(도장판/claimed 여부)
  const [status, setStatus] = useState<StatusRes | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // 팝업
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMsg, setModalMsg] = useState('')
  const [modalTitle, setModalTitle] = useState('')

  const openModal = useCallback((title: string, message: string) => {
    setModalTitle(title)
    setModalMsg(message)
    setModalOpen(true)
  }, [])

  const loginGoogle = useCallback(async () => {
    const base = getSiteOrigin()
    const redirectTo = `${base}/auth/callback?next=/reward`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }, [supabase])

  const loadStatus = useCallback(async () => {
    if (!user) {
      setStatus(null)
      return
    }
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/rewards/status', { method: 'GET' })
      const raw = await res.text()
      let json: any = {}
      try {
        json = raw ? JSON.parse(raw) : {}
      } catch {
        json = {}
      }

      if (!res.ok) {
        setStatus({ ok: false, reason: 'http_error', error: `HTTP ${res.status}\n${raw.slice(0, 800)}` })
        return
      }

      setStatus(json as StatusRes)
    } catch (e) {
      setStatus({ ok: false, reason: 'client_error', error: String(e) } as any)
    } finally {
      setLoadingStatus(false)
    }
  }, [user])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  /**
   * ✅ Claim 응답 표준화
   * - (1) { ok: true/false, reason } 형태
   * - (2) { claimed: true/false, reason } 형태
   * - (3) 이상한 형태 => raw로 디버깅
   */
  function normalizeClaimResponse(json: any): { ok: boolean; reason?: string } {
    if (!json || typeof json !== 'object') return { ok: false, reason: 'bad_json' }

    // A) ok 기반
    if (typeof json.ok === 'boolean') {
      if (json.ok) return { ok: true }
      return { ok: false, reason: String(json.reason ?? 'unknown') }
    }

    // B) claimed 기반
    if (typeof json.claimed === 'boolean') {
      if (json.claimed) return { ok: true }
      const r = String(json.reason ?? '')
      // reason이 없으면 이미 받은 케이스로 처리
      return { ok: false, reason: r || 'already_claimed' }
    }

    // C) 완전 예외
    return { ok: false, reason: 'unknown_payload' }
  }

  const handleClaim = useCallback(async () => {
    if (!user) {
      openModal('Sign in required', MSG_NEED_SIGNIN)
      return
    }

    setLoadingClaim(true)
    try {
      const res = await fetch('/api/rewards/claim', { method: 'POST' })
      const raw = await res.text()

      let json: any = {}
      try {
        json = raw ? JSON.parse(raw) : {}
      } catch {
        json = {}
      }

      // ✅ HTTP 에러면 무조건 raw를 보여줘야 원인 잡힘
      if (!res.ok) {
        openModal('Error', `${MSG_UNKNOWN}\n\nHTTP ${res.status}\n${raw.slice(0, 800)}`)
        return
      }

      const norm = normalizeClaimResponse(json)

      if (norm.ok) {
        openModal('Success', MSG_SUCCESS)
        window.dispatchEvent(new Event('points:refresh'))
        await loadStatus()
        return
      }

      // 실패 reason 매핑
      if (norm.reason === 'no_question_today') {
        openModal('Action required', MSG_NO_QUESTION)
        return
      }
      if (norm.reason === 'already_claimed') {
        openModal('Already claimed', MSG_ALREADY)
        return
      }
      if (norm.reason === 'not_authenticated') {
        openModal('Sign in required', MSG_NEED_SIGNIN)
        return
      }

      // ✅ 여기 오면 reason이 이상한 케이스 -> raw 포함해서 노출
      openModal('Error', `${MSG_UNKNOWN}\n\nreason=${norm.reason}\n${raw.slice(0, 800)}`)
    } catch (e) {
      openModal('Error', `${MSG_UNKNOWN}\n\n${String(e)}`)
    } finally {
      setLoadingClaim(false)
    }
  }, [user, openModal, loadStatus])

  const claimedToday = status?.ok ? status.claimed_today : false
  const board = status?.ok ? status.board : Array.from({ length: 14 }, () => false)
  const streak = status?.ok ? status.streak : 0

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
      <Modal open={modalOpen} title={modalTitle} message={modalMsg} onClose={() => setModalOpen(false)} />

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

        {/* ✅ 14-day stamp board */}
        <div className="mt-6 border-t border-[#eeeeee] pt-5">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold text-[#1e1e1e]">14-Day Stamp Board</div>

            {user ? (
              <div className="text-[12px] text-gray-600">
                {status?.ok ? (
                  <>
                    Streak: <span className="font-semibold text-[#1e1e1e]">{streak}</span>
                    {loadingStatus ? <span className="ml-2">Loading…</span> : null}
                  </>
                ) : (
                  <>
                    {loadingStatus ? (
                      <span>Loading…</span>
                    ) : (
                      <span className="text-red-600">
                        Status error: {status?.reason}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Array.from({ length: 14 }).map((_, i) => {
              const day = i + 1
              const filled = board[i]
              const filledCount = board.filter(Boolean).length

              return (
                <div key={day} className="border border-[#eeeeee] p-3 text-center bg-white">
                  <div className="text-[12px] font-semibold text-[#1e1e1e]">Day {day}</div>

                  <div className="mt-2 flex items-center justify-center">
                    <div
                      className={[
                        'w-6 h-6 rounded',
                        filled ? 'bg-[#CFF3D9] border border-[#7BD69A]' : 'bg-[#f3f3f3] border border-[#e5e5e5]',
                      ].join(' ')}
                      title={filled ? 'Checked' : 'Not yet'}
                    />
                  </div>

                  <div className="mt-2 text-[12px] text-gray-700">{REWARDS[i]}p</div>

                  {/* ✅ 오늘 보상 지급 받았으면 CLEAR */}
                  {claimedToday && filled && day === filledCount ? (
                    <div className="mt-2 inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#1e1e1e] text-white text-[11px] font-semibold">
                      CLEAR
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#eeeeee] pt-4">
          <div className="text-[13px] text-gray-700">
            <div className="font-semibold text-[#1e1e1e]">My Reward</div>
            <div className="mt-1">* Claim today is available after you ask at least 1 question on the Coach.</div>
          </div>

          {claimButton}
        </div>
      </div>
    </div>
  )
}
