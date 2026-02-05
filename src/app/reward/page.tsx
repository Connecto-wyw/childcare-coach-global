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

// Indianbob colors
const INDIANBOB_RED = '#9F1D23'
const INDIANBOB_BLUE = '#3EB6F1'

function Icon({
  kind,
  size = 16,
  color = '#1e1e1e',
}: {
  kind: 'gift' | 'rule' | 'calendar' | 'refresh' | 'plus' | 'alert' | 'coin'
  size?: number
  color?: string
}) {
  // lightweight inline SVGs (no external deps)
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const }
  switch (kind) {
    case 'gift':
      return (
        <svg {...common} aria-hidden>
          <path
            d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 7H2v5h20V7Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 22V7"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'rule':
      return (
        <svg {...common} aria-hidden>
          <path
            d="M8 6h13M8 12h13M8 18h13 extraction"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 6h.01M3 12h.01M3 18h.01"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common} aria-hidden>
          <path
            d="M8 2v3M16 2v3"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 8h18"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...common} aria-hidden>
          <path
            d="M21 12a9 9 0 0 1-15.3 6.36"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 12a9 9 0 0 1 15.3-6.36"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 20l-1.5-3.5L1 18"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 4l1.5 3.5L23 6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'alert':
      return (
        <svg {...common} aria-hidden>
          <path
            d="M12 9v4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 17h.01"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'coin':
    default:
      return (
        <svg {...common} aria-hidden>
          <path
            d="M12 2c4.42 0 8 1.79 8 4s-3.58 4-8 4-8-1.79-8-4 3.58-4 8-4Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 6v6c0 2.21 3.58 4 8 4s8-1.79 8-4V6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 12v6c0 2.21 3.58 4 8 4s8-1.79 8-4v-6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

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

        {/* ✅ Rewards / Rule with icons + better readability */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Rewards */}
          <div className="border border-[#eeeeee] p-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-md"
                style={{ backgroundColor: `${INDIANBOB_RED}14` }}
              >
                <Icon kind="gift" color={INDIANBOB_RED} />
              </span>
              <div className="text-[13px] font-extrabold text-[#1e1e1e]">Rewards</div>
            </div>

            <ul className="mt-3 space-y-2 text-[13px] text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="calendar" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  <span className="font-semibold text-[#1e1e1e]">Day 1–6</span>:{' '}
                  <span className="font-semibold" style={{ color: INDIANBOB_RED }}>
                    100p/day
                  </span>
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="plus" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  <span className="font-semibold text-[#1e1e1e]">Day 7</span>:{' '}
                  <span className="font-semibold" style={{ color: INDIANBOB_RED }}>
                    300p
                  </span>
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="calendar" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  <span className="font-semibold text-[#1e1e1e]">Day 8–13</span>:{' '}
                  <span className="font-semibold" style={{ color: INDIANBOB_RED }}>
                    100p/day
                  </span>
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="gift" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  <span className="font-semibold text-[#1e1e1e]">Day 14</span>:{' '}
                  <span className="font-semibold" style={{ color: INDIANBOB_RED }}>
                    600p
                  </span>
                  <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: `${INDIANBOB_RED}14`, color: INDIANBOB_RED }}
                  >
                    Bonus
                  </span>
                </span>
              </li>
            </ul>
          </div>

          {/* Rule */}
          <div className="border border-[#eeeeee] p-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-md"
                style={{ backgroundColor: `${INDIANBOB_BLUE}14` }}
              >
                <Icon kind="rule" color={INDIANBOB_BLUE} />
              </span>
              <div className="text-[13px] font-extrabold text-[#1e1e1e]">Rule</div>
            </div>

            <ul className="mt-3 space-y-2 text-[13px] text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="calendar" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  <span className="font-semibold text-[#1e1e1e]">One claim</span> per day.
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="refresh" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  Missing a day <span className="font-semibold" style={{ color: INDIANBOB_RED }}>resets</span> streak to Day 1.
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="coin" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  Points are added to your <span className="font-semibold text-[#1e1e1e]">balance</span>.
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="mt-[2px]">
                  <Icon kind="alert" color={INDIANBOB_BLUE} />
                </span>
                <span>
                  If you don’t ask a question on Coach, you can’t claim for that day.
                </span>
              </li>
            </ul>
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
