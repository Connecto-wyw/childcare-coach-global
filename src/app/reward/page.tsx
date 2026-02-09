'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
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

// ✅ Indianbob colors
const INDIANBOB_RED = '#9F1D23'
const ACCENT_BLUE = '#3EB6F1'

// ✅ Stamp icons
const STAMP_BEFORE_SRC = '/reward/stamp-before.png'
const STAMP_AFTER_SRC = '/reward/stamp-after.png'

function IconWrap({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center border"
      style={{ backgroundColor: bg, borderColor: 'rgba(0,0,0,0.06)' }}
    >
      {children}
    </div>
  )
}

function SvgGift({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 7H4v5h16V7Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 7v14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 7H8.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 7h3.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SvgList({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12h13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 18h13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function SvgCalendar({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3v3M17 3v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SvgReset({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3.2-6.9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M21 3v6h-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SvgCoins({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Z" stroke={color} strokeWidth="2" />
      <path d="M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7" stroke={color} strokeWidth="2" />
      <path d="M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" stroke={color} strokeWidth="2" />
    </svg>
  )
}

function SvgAlert({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 9v5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M10.3 3.6 2.7 18a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
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
      <div className="w-full max-w-sm bg-white border border-[#dcdcdc] p-6">
        <div className="text-[16px] font-extrabold text-[#1e1e1e]">{title}</div>
        <div className="mt-2 text-[14px] text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="h-10 px-5 rounded-md bg-[#1e1e1e] text-white text-[14px] font-semibold">
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
  const [status, setStatus] = useState<StatusRes | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

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

  function normalizeClaimResponse(json: any): { ok: boolean; reason?: string } {
    if (!json || typeof json !== 'object') return { ok: false, reason: 'bad_json' }

    if (typeof json.ok === 'boolean') {
      if (json.ok) return { ok: true }
      return { ok: false, reason: String(json.reason ?? 'unknown') }
    }

    if (typeof json.claimed === 'boolean') {
      if (json.claimed) return { ok: true }
      const r = String(json.reason ?? '')
      return { ok: false, reason: r || 'already_claimed' }
    }

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
        <button disabled className="rounded-md bg-gray-200 px-5 py-3 text-[15px] font-semibold text-gray-500">
          Loading…
        </button>
      )
    }

    if (!user) {
      return (
        <button onClick={loginGoogle} className="rounded-md bg-[#1e1e1e] px-5 py-3 text-[15px] font-semibold text-white">
          Sign in with Google
        </button>
      )
    }

    return (
      <button
        onClick={handleClaim}
        disabled={loadingClaim}
        className="rounded-md px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: INDIANBOB_RED }}
      >
        {loadingClaim ? 'Claiming…' : 'Claim today'}
      </button>
    )
  }, [authLoading, user, loadingClaim, loginGoogle, handleClaim])

  // ✅ 섹션 타이틀(Stamp Board와 동일한 톤)로 통일하기 위한 공통 클래스
  const sectionTitleClass = 'text-[16px] md:text-[18px] font-semibold text-[#1e1e1e]'

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Modal open={modalOpen} title={modalTitle} message={modalMsg} onClose={() => setModalOpen(false)} />

        <h1 className="text-[22px] font-medium leading-tight">Reward</h1>
        <p className="mt-3 text-[14px] text-[#b4b4b4]">Daily check-in rewards for asking 1 question on Coach.</p>

        <div className="mt-10 border-t border-[#eeeeee]">
          {/* ===================== 1) 14-Day Stamp Board ===================== */}
          <section className="py-10">
            <div className="flex items-center justify-between">
              <div className={sectionTitleClass}>14-Day Stamp Board</div>

              {user ? (
                <div className="text-[13px] md:text-[14px] text-gray-600">
                  {status?.ok ? (
                    <>
                      Streak: <span className="font-extrabold text-[#1e1e1e]">{streak}</span>
                      {loadingStatus ? <span className="ml-2">Loading…</span> : null}
                    </>
                  ) : (
                    <>
                      {loadingStatus ? (
                        <span>Loading…</span>
                      ) : (
                        <span className="text-red-600">Status error: {status?.reason}</span>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }).map((_, i) => {
                const day = i + 1
                const filled = board[i]
                const filledCount = board.filter(Boolean).length

                return (
                  <div key={day} className="border border-[#eeeeee] bg-white text-center p-2 min-h-[84px]">
                    <div className="text-[11px] font-semibold text-[#1e1e1e]">Day {day}</div>

                    <div className="mt-2 flex items-center justify-center">
                      <div className="relative w-6 h-6">
                        <Image
                          src={filled ? STAMP_AFTER_SRC : STAMP_BEFORE_SRC}
                          alt={filled ? 'Mission completed' : 'Mission not started'}
                          fill
                          sizes="24px"
                          className={['object-contain', !user ? 'opacity-70' : 'opacity-100'].join(' ')}
                          priority={false}
                        />
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-gray-700 font-semibold">{REWARDS[i]}p</div>

                    {claimedToday && filled && day === filledCount ? (
                      <div
                        className="mt-2 inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-extrabold text-white"
                        style={{ backgroundColor: '#1e1e1e' }}
                      >
                        CLEAR
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ===================== (이동) My Reward ===================== */}
          <section className="border-t border-[#eeeeee] py-10">
            {/* ✅ 타이틀: Stamp Board와 동일한 크기/굵기 */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={sectionTitleClass}>My Reward</div>
                <div className="mt-2 text-[14px] md:text-[15px] text-gray-700 leading-relaxed">
                Claim today is available after you ask at least 1 question on the Coach.
                </div>
              </div>

              {claimButton}
            </div>
          </section>

          {/* ===================== 2) Daily Check-in ===================== */}
          <section className="border-t border-[#eeeeee] py-10">
            {/* ✅ 타이틀: Stamp Board와 동일한 크기/굵기 */}
            <div className={sectionTitleClass}>Daily Check-in</div>
            <div className="mt-2 text-[14px] md:text-[15px] text-gray-700 leading-relaxed">
              Ask 1 question on Coach each day to earn points. Complete 14 days to finish the cycle, then it restarts from Day 1.
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[#eeeeee] p-5 bg-white">
                <div className="flex items-center gap-3">
                  <IconWrap bg="rgba(159,29,35,0.08)">
                    <SvgGift color={INDIANBOB_RED} />
                  </IconWrap>
                  <div className="text-[16px] md:text-[17px] font-extrabold text-[#1e1e1e]">Rewards</div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <SvgCalendar color={ACCENT_BLUE} />
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      <span className="font-semibold">Day 1–6:</span>{' '}
                      <span className="font-extrabold" style={{ color: INDIANBOB_RED }}>
                        100p/day
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 5v14" stroke={ACCENT_BLUE} strokeWidth="2" strokeLinecap="round" />
                        <path d="M5 12h14" stroke={ACCENT_BLUE} strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      <span className="font-semibold">Day 7:</span>{' '}
                      <span className="font-extrabold" style={{ color: INDIANBOB_RED }}>
                        300p
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <SvgCalendar color={ACCENT_BLUE} />
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      <span className="font-semibold">Day 8–13:</span>{' '}
                      <span className="font-extrabold" style={{ color: INDIANBOB_RED }}>
                        100p/day
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="mt-0.5">
                      <SvgGift color={ACCENT_BLUE} />
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      <span className="font-semibold">Day 14:</span>{' '}
                      <span className="font-extrabold" style={{ color: INDIANBOB_RED }}>
                        600p
                      </span>
                      <span
                        className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[12px] font-extrabold"
                        style={{ backgroundColor: 'rgba(159,29,35,0.10)', color: INDIANBOB_RED }}
                      >
                        Bonus
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-[#eeeeee] p-5 bg-white">
                <div className="flex items-center gap-3">
                  <IconWrap bg="rgba(62,182,241,0.10)">
                    <SvgList color={ACCENT_BLUE} />
                  </IconWrap>
                  <div className="text-[16px] md:text-[17px] font-extrabold text-[#1e1e1e]">Rule</div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <SvgCalendar color={ACCENT_BLUE} />
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      <span className="font-semibold">One claim</span> per day.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <SvgReset color={ACCENT_BLUE} />
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      Missing a day{' '}
                      <span className="font-extrabold" style={{ color: INDIANBOB_RED }}>
                        resets
                      </span>{' '}
                      streak to Day 1.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <SvgCoins color={ACCENT_BLUE} />
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      Points are added to your <span className="font-extrabold">balance</span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <SvgAlert color={ACCENT_BLUE} />
                    </div>
                    <div className="text-[14px] md:text-[15px] text-gray-800 leading-relaxed">
                      If you don’t ask a question on Coach, you can’t claim for that day.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
