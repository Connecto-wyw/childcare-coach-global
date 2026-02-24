'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser, useSupabase } from '@/app/providers'

type Props = { teamId: string }

// ✅ 이벤트 팀ID (Korean Daily Care Essential)
const GIVEAWAY_TEAM_ID = 'e2c8be1a-31df-4554-890c-e2dde44c5aec'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function JoinButtonClient({ teamId }: Props) {
  const supabase = useSupabase()
  const { user, loading } = useAuthUser()
  const router = useRouter()

  const isGiveaway = teamId === GIVEAWAY_TEAM_ID

  const [submitting, setSubmitting] = useState(false)

  // 기존 모달(로그인/에러/완료) - 재사용
  const [open, setOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('Sign in required')
  const [modalMessage, setModalMessage] = useState('You must be signed in to join.')
  const [modalAction, setModalAction] = useState<'close' | 'google_login'>('close')

  // ✅ 이메일 입력 모달 (giveaway 전용)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailError, setEmailError] = useState('')

  const showModal = (title: string, message: string, action: 'close' | 'google_login' = 'close') => {
    setModalTitle(title)
    setModalMessage(message)
    setModalAction(action)
    setOpen(true)
  }

  const closeModal = () => setOpen(false)

  const startGoogleLogin = async () => {
    setOpen(false)

    const redirectTo = typeof window !== 'undefined' ? window.location.href : undefined

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) {
      console.error('[signInWithOAuth] error:', error)
      showModal('Error', String((error as any)?.message ?? 'Login failed.'), 'close')
    }
  }

  const onModalOk = async () => {
    if (modalAction === 'google_login') {
      await startGoogleLogin()
      return
    }
    closeModal()
  }

  // ✅ team_members insert (Joined N 증가용)
  const ensureJoined = async () => {
    if (!teamId) throw new Error('Missing teamId')
    if (!user) throw new Error('Missing user')

    // 유저 이메일 안전 확보 (기존 로직 유지)
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr) console.error('[auth.getUser] error:', userErr)

    const email = userRes?.user?.email ?? null

    const { error: insErr } = await supabase.from('team_members').insert([
      {
        team_id: teamId,
        user_id: user.id,
        email,
      },
    ])

    if (insErr) {
      const msg = String((insErr as any)?.message ?? '')
      const code = (insErr as any)?.code

      // 중복 join이면 OK 취급
      if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
        return { alreadyJoined: true }
      }

      throw new Error(msg || 'Insert failed.')
    }

    return { alreadyJoined: false }
  }

  // ✅ giveaway 이메일 저장
  const saveGiveawayEmail = async (email: string) => {
    const res = await fetch('/api/giveaway/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, email }),
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      const err = json?.error || 'request_failed'
      const msg = json?.message || ''
      throw new Error(msg ? `${err}: ${msg}` : err)
    }

    if (!json?.ok) {
      throw new Error(json?.error || 'request_failed')
    }
  }

  // ✅ giveaway 버튼 클릭 → 이메일 입력 팝업
  const openEmailModal = async () => {
    if (!user) {
      showModal('Sign in required', 'You must be signed in to enter for free.', 'google_login')
      return
    }

    // 기본값: 로그인 이메일(있으면)
    let defaultEmail = ''
    try {
      const { data } = await supabase.auth.getUser()
      defaultEmail = data?.user?.email ? String(data.user.email) : ''
    } catch {
      defaultEmail = ''
    }

    setEmailValue(defaultEmail)
    setEmailError('')
    setEmailModalOpen(true)
  }

  const closeEmailModal = () => {
    setEmailModalOpen(false)
    setEmailError('')
  }

  // ✅ giveaway 제출 (join + email 저장)
  const submitGiveaway = async () => {
    const email = (emailValue || '').trim()

    if (!email || !isValidEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    if (!user) {
      closeEmailModal()
      showModal('Sign in required', 'You must be signed in to enter for free.', 'google_login')
      return
    }

    setSubmitting(true)
    setEmailError('')

    try {
      // 1) Joined N 카운트용
      await ensureJoined()

      // 2) giveaway_entries 저장
      await saveGiveawayEmail(email)

      setSubmitting(false)
      setEmailModalOpen(false)
      router.refresh()

      showModal(
        'Entry completed',
        'Your entry has been submitted. If you win, we’ll contact you at the email address you provided.',
        'close'
      )
    } catch (e: any) {
      console.error('[giveaway submit] error:', e)
      setSubmitting(false)
      setEmailError(String(e?.message ?? e ?? 'Failed to submit'))
    }
  }

  // ✅ 일반 상품 join (기존)
  const joinNormal = async () => {
    if (!teamId) return

    if (!user) {
      showModal('Sign in required', 'You must be signed in to join.', 'google_login')
      return
    }

    setSubmitting(true)

    try {
      await ensureJoined()

      setSubmitting(false)
      router.refresh()

      showModal(
        'Thanks for joining!',
        'Thank you for joining. You won’t be charged right now, and nothing will be shipped yet. When the official sale begins, we’ll notify you by email.',
        'close'
      )
    } catch (e: any) {
      console.error('[join] unexpected error:', e)
      setSubmitting(false)
      showModal('Error', String(e?.message ?? e ?? 'Failed to join'), 'close')
    }
  }

  const onClickMain = async () => {
    if (loading || submitting) return

    if (isGiveaway) {
      await openEmailModal()
      return
    }

    await joinNormal()
  }

  const buttonLabel = useMemo(() => {
    if (submitting) return isGiveaway ? 'Submitting…' : 'Joining…'
    return isGiveaway ? 'Enter for Free' : 'Join now'
  }, [submitting, isGiveaway])

  return (
    <>
      <button
        onClick={onClickMain}
        disabled={loading || submitting}
        className="rounded-full bg-[#0e0e0e] px-8 py-3 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {/* ✅ Giveaway Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={closeEmailModal} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="px-5 pt-5">
              <h3 className="text-[16px] font-semibold text-[#0e0e0e]">Entry completed</h3>
              <p className="mt-2 text-[14px] leading-6 text-[#444]">
                Your entry will be submitted for free. If you win, please provide the email address where we should contact you.
              </p>

              <div className="mt-4">
                <label className="block text-[13px] font-semibold text-[#111]">Email</label>
                <input
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-xl border border-[#ddd] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#0e0e0e]"
                />
                {emailError ? <p className="mt-2 text-[12px] font-semibold text-red-600">{emailError}</p> : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#eee] px-5 py-3">
              <button
                type="button"
                onClick={closeEmailModal}
                disabled={submitting}
                className="h-9 rounded-lg border border-[#ddd] bg-white px-3 text-[14px] font-semibold text-[#111] hover:bg-[#f7f7f7] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitGiveaway}
                disabled={submitting}
                className="h-9 rounded-lg bg-[#0e0e0e] px-4 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 기존 Modal (로그인/에러/완료) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="px-5 pt-5">
              <h3 className="text-[16px] font-semibold text-[#0e0e0e]">{modalTitle}</h3>
              <p className="mt-2 text-[14px] leading-6 text-[#444]">{modalMessage}</p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#eee] px-5 py-3">
              <button
                type="button"
                onClick={onModalOk}
                className="h-9 rounded-lg border border-[#ddd] bg-white px-3 text-[14px] font-semibold text-[#111] hover:bg-[#f7f7f7]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}