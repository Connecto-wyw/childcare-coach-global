// src/app/reward/RewardClient.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

type RewardsStatusResponse =
  | {
      ok: true
      today: string
      claimed_today: boolean
      streak: number // 1~14 (cyclePos)
      board: boolean[] // length 14
      reason?: string
    }
  | {
      ok: false
      today: string
      claimed_today: boolean
      streak: number
      board: boolean[]
      reason: string
      error?: string
    }

type ClaimApiResponse =
  | {
      ok: true
      // ✅ claim route가 버전에 따라 키가 다를 수 있어서 둘 다 수용
      points_added?: number
      cycle_pos?: number
      streak_total?: number
      today?: string
      streak?: number
      board?: boolean[]
      total_points?: number
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
      today?: string
    }

type ClaimState =
  | { type: 'idle' }
  | { type: 'ok'; pointsAdded: number; cyclePos: number }
  | { type: 'already_claimed' }
  | { type: 'no_question_today' }
  | { type: 'not_authenticated' }
  | { type: 'http_error'; status: number; message: string }
  | { type: 'network_error'; message: string }

const REWARDS = [
  100, 100, 100, 100, 100, 100, // 1-6
  300, // 7
  100, 100, 100, 100, 100, 100, // 8-13
  600, // 14
]

function pointsForDay(day: number) {
  // day: 1~14
  return REWARDS[day - 1] ?? 100
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

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

/** ✅ 모바일 5 / 5 / 4 고정 레이아웃을 위해 3줄로 쪼갬 */
function split14ForMobile(items: any[]) {
  return [items.slice(0, 5), items.slice(5, 10), items.slice(10, 14)]
}

export default function RewardClient() {
  const { user } = useAuthUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [claimState, setClaimState] = useState<ClaimState>({ type: 'idle' })

  const [myPoints, setMyPoints] = useState<number | null>(null)
  const [myStreak, setMyStreak] = useState<number | null>(null)

  // ✅ 보드 상태
  const [board, setBoard] = useState<boolean[]>(Array.from({ length: 14 }, () => false))
  const [cyclePos, setCyclePos] = useState<number>(0) // 0이면 아직 시작 전
  const [claimedToday, setClaimedToday] = useState<boolean>(false)

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

  const loadRewardStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/rewards/status', { method: 'GET', cache: 'no-store' })
      const json = (await safeJson(res)) as RewardsStatusResponse

      // status는 200으로 통일한다고 했으니 res.ok 여부보단 payload 우선
      const nextBoard = Array.isArray((json as any)?.board) ? (json as any).board : []
      const nextStreak = Number((json as any)?.streak ?? 0)
      const nextClaimedToday = Boolean((json as any)?.claimed_today ?? false)

      if (nextBoard.length === 14) setBoard(nextBoard)
      else setBoard(Array.from({ length: 14 }, () => false))

      setCyclePos(nextStreak)
      setClaimedToday(nextClaimedToday)
    } catch (e) {
      console.error('[rewards status] error:', e)
      // 조용히 실패 처리
    }
  }, [])

  useEffect(() => {
    void loadMySummary()
  }, [loadMySummary])

  useEffect(() => {
    void loadRewardStatus()
  }, [loadRewardStatus])

  const onClaim = useCallback(async () => {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    setClaimState({ type: 'idle' })
    setLoading(true)

    try {
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      const json = (await safeJson(res)) as any

      if (!res.ok) {
        const reason = String(json?.reason ?? '')
        if (res.status === 401 || reason === 'not_authenticated') {
          setClaimState({ type: 'not_authenticated' })
          setModal({ open: true, title: 'Login required', body: 'Please login and try again.' })
          return
        }

        setClaimState({
          type: 'http_error',
          status: res.status,
          message: String(json?.error ?? json?.reason ?? 'http_error'),
        })
        setModal({ open: true, title: 'Error', body: 'Something went wrong. Please try again.' })
        return
      }

      const payload = json as ClaimApiResponse

      if (payload?.ok === true) {
        const add = Number((payload as any)?.points_added ?? 0)

        // ✅ cyclePos 키가 cycle_pos / streak 둘 다 올 수 있음
        const nextCycle = Number((payload as any)?.cycle_pos ?? (payload as any)?.streak ?? cyclePos ?? 1)

        setClaimState({ type: 'ok', pointsAdded: add, cyclePos: nextCycle })

        // points/streak 즉시 반영
        setMyPoints((prev) => (prev ?? 0) + add)
        setMyStreak((prev) => {
          // profiles.reward_streak는 “총 연속일”인데 여기선 UI에서 큰 의미없어서 유지
          // 대신 기존 값 있으면 +1 정도로만 반영(서버가 authoritative)
          return prev ?? null
        })

        // ✅ 보드 즉시 반영 (claim이 board 내려주면 그거 사용)
        if (Array.isArray((payload as any)?.board) && (payload as any).board.length === 14) {
          setBoard((payload as any).board)
        } else {
          // 없으면 status 다시 로드
          void loadRewardStatus()
        }

        setCyclePos(nextCycle)
        setClaimedToday(true)

        window.dispatchEvent(new Event('points:refresh'))
        setToast(add > 0 ? `✅ +${add}p` : '✅ Checked in')
        return
      }

      const reason = String((payload as any)?.reason ?? '')

      if (reason === 'already_claimed') {
        setClaimState({ type: 'already_claimed' })
        setModal({ open: true, title: 'Already claimed', body: 'You already claimed today.' })
        setClaimedToday(true)
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
        setModal({ open: true, title: 'Login required', body: 'Please login and try again.' })
        return
      }

      setClaimState({ type: 'http_error', status: 200, message: reason || 'unknown' })
      setModal({ open: true, title: 'Error', body: 'Something went wrong. Please try again.' })
    } catch (e: any) {
      setClaimState({ type: 'network_error', message: String(e?.message ?? e) })
      setModal({ open: true, title: 'Error', body: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
      // claim 이후에는 status 한 번 더 동기화(안전)
      void loadRewardStatus()
      void loadMySummary()
    }
  }, [user, supabase, cyclePos, loadRewardStatus, loadMySummary])

  const summaryText = useMemo(() => {
    if (!user) return null
    const s = myStreak ?? 0
    const p = myPoints ?? 0
    return `Streak: ${s} days · Points: ${format(p)}`
  }, [user, myPoints, myStreak])

  // ✅ 보드 렌더용 데이터
  const cells = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const day = i + 1
      const cleared = Boolean(board?.[i])
      const isTodayCell = claimedToday && cyclePos === day // 오늘 claim 했다면 현재 cyclePos가 오늘 칸
      return { day, cleared, isTodayCell, points: pointsForDay(day) }
    })
  }, [board, cyclePos, claimedToday])

  const mobileRows = useMemo(() => split14ForMobile(cells), [cells])

  const StampCell = ({ day, cleared, isTodayCell, points }: any) => {
    return (
      <div className="relative rounded-lg border border-[#e9e9e9] bg-white px-2 py-3 text-center">
        {/* Day label */}
        <div className="text-[12px] font-semibold text-[#1e1e1e]">Day {day}</div>

        {/* P circle */}
        <div className="mt-2 flex items-center justify-center">
          <div
            className={[
              'h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold',
              cleared ? 'border-2 border-[#DA3632] text-[#DA3632]' : 'border border-[#d9d9d9] text-[#b5b5b5]',
            ].join(' ')}
          >
            P
          </div>
        </div>

        <div className="mt-2 text-[12px] text-[#1e1e1e]">{points}p</div>

        {/* ✅ CLEAR 뱃지: 오늘만 X, cleared면 전부 표시 */}
        {cleared && (
          <div
            className={[
              'absolute left-1/2 -translate-x-1/2 mt-0',
              'top-[46px]',
              'px-2 py-[2px] rounded-md text-[11px] font-bold',
              isTodayCell ? 'bg-[#0e0e0e] text-white' : 'bg-[#1e1e1e] text-white',
            ].join(' ')}
          >
            CLEAR
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {toast && (
        <div className="mb-3 flex justify-center">
          <div className="px-3 py-2 bg-white border border-[#dcdcdc] text-[13px] font-semibold text-[#0e0e0e] shadow-sm">
            {toast}
          </div>
        </div>
      )}

      {(claimState.type === 'http_error' || claimState.type === 'network_error') && (
        <div className="mb-2 text-right text-[13px] text-red-600">
          Status error:{' '}
          {claimState.type === 'http_error' ? `http_error (${claimState.status})` : 'network_error'}
        </div>
      )}

      {/* ✅ 14-Day Stamp Board */}
      <div className="border border-[#dcdcdc] bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">14-Day Stamp Board</div>
          <div className="text-[13px] font-semibold text-[#1e1e1e]">Streak: {cyclePos || 0}</div>
        </div>

        {/* Desktop: 7 x 2 */}
        <div className="mt-4 hidden md:grid grid-cols-7 gap-3">
          {cells.map((c) => (
            <StampCell key={c.day} {...c} />
          ))}
        </div>

        {/* Mobile: 5 / 5 / 4 */}
        <div className="mt-4 md:hidden space-y-3">
          {mobileRows.map((row, idx) => (
            <div key={idx} className={['grid gap-3', idx === 2 ? 'grid-cols-4' : 'grid-cols-5'].join(' ')}>
              {row.map((c: any) => (
                <StampCell key={c.day} {...c} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ✅ My Reward */}
      <div className="mt-5 border border-[#dcdcdc] bg-white p-5">
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
            <p className="mt-2 text-[13px] text-gray-700">You need to sign in to use this feature.</p>

            <div className="mt-4 grid gap-2">
              <button
                onClick={loginGoogle}
                className="h-10 bg-[#1e1e1e] text-white text-[13px] font-semibold"
              >
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
