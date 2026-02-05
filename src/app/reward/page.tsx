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
      const json = (await res.json()) as StatusRes
      setStatus(json)
    } catch (e) {
      setStatus({ ok: false, reason: 'client_error', error: String(e) } as any)
    } finally {
      setLoadingStatus(false)
    }
  }, [user])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleClaim = useCallback(async () => {
    if (!user) {
      openModal('Sign in required', MSG_NEED_SIGNIN)
      return
    }

    setLoadingClaim(true)
    try {
      const res = await fetch('/api/rewards/claim', { method: 'POST' })
      const json = (await res.json()) as ClaimRes

      if (!json?.ok) {
        if (json.reason === 'no_question_today') {
          openModal('Action required', MSG_NO_QUESTION)
          return
        }
        if (json.reason === 'already_claimed') {
          openModal('Already claimed', MSG_ALREADY)
          return
        }
        if (json.reason === 'not_authenticated') {
          openModal('Sign in required', MSG_NEED_SIGNIN)
          return
        }
        openModal('Error', MSG_UNKNOWN)
        return
      }

      // ✅ 성공 팝업 (요구한 문구 고정)
      openModal('Success', MSG_SUCCESS)

      // ✅ NavBar 포인트 갱신 + 도장판 상태 갱신
      window.dispatchEvent(new Event('points:refresh'))
      await loadStatus()
    } catch (e) {
      // 네트워크/JSON 파싱/404 같은 케이스도 여기서 잡힘 → “아무 반응 없음” 방지
      openModal('Error', MSG_UNKNOWN)
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

        {/* ✅ 14-day stamp board (요구사항) */}
        <div className="mt-6 border-t border-[#eeeeee] pt-5">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold text-[#1e1e1e]">14-Day Stamp Board</div>
            {user && status?.ok ? (
              <div className="text-[12px] text-gray-600">
                Streak: <span className="font-semibold text-[#1e1e1e]">{streak}</span>
                {loadingStatus ? <span className="ml-2">Loading…</span> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Array.from({ length: 14 }).map((_, i) => {
              const day = i + 1
              const filled = board[i]
              const todayBox = claimedToday && status?.ok && day === Math.min((status.board.filter(Boolean).length || 1), 14)

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

                  {/* ✅ 오늘 보상 지급 받았으면 "CLEAR" 같은 도장 표시 */}
                  {claimedToday && filled && day === board.filter(Boolean).length ? (
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
