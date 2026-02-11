'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser, useSupabase } from '@/app/providers'

type Props = { teamId: string }

export default function JoinButtonClient({ teamId }: Props) {
  const supabase = useSupabase()
  const { user, loading } = useAuthUser()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)

  // ✅ modal state
  const [open, setOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('Sign in required')
  const [modalMessage, setModalMessage] = useState('You must be signed in to join.')

  // ✅ when modal is "sign in required", OK should trigger Google login
  const [modalAction, setModalAction] = useState<'close' | 'google_login'>('close')

  const showModal = (title: string, message: string, action: 'close' | 'google_login' = 'close') => {
    setModalTitle(title)
    setModalMessage(message)
    setModalAction(action)
    setOpen(true)
  }

  const closeModal = () => setOpen(false)

  const startGoogleLogin = async () => {
    // 모달은 닫고 진행(UX)
    setOpen(false)

    // ✅ 구글 계정 선택 화면 강제: prompt=select_account
    // ✅ 로그인 후 다시 이 팀 상세 페이지로 돌아오게: redirectTo=현재 URL
    const redirectTo =
      typeof window !== 'undefined' ? window.location.href : undefined

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      console.error('[signInWithOAuth] error:', error)
      // 로그인 자체가 실패하면 다시 모달로 에러 보여주기
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

  const join = async () => {
    if (!teamId) return

    // ✅ not logged in → modal (OK 누르면 구글 로그인으로)
    if (!user) {
      showModal('Sign in required', 'You must be signed in to join.', 'google_login')
      return
    }

    setSubmitting(true)

    // ✅ 로그인 유저 이메일 확보(확실히)
    const {
      data: { user: freshUser },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr) {
      console.error('[auth.getUser] error:', userErr)
    }

    const email = freshUser?.email ?? null

    const { error } = await supabase.from('team_members').insert([
      {
        team_id: teamId,
        user_id: user.id,
        email,
      },
    ])

    if (error) {
      const msg = String((error as any)?.message ?? '')
      const code = (error as any)?.code

      if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
        showModal('Already joined', 'You have already joined this team.', 'close')
        setSubmitting(false)
        router.refresh()
        return
      }

      showModal('Error', msg || 'Something went wrong.', 'close')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    router.refresh()
    showModal('Joined', 'Joined successfully. We will notify you by email.', 'close')
  }

  return (
    <>
      <button
        onClick={join}
        disabled={loading || submitting}
        className="rounded-full bg-[#0e0e0e] px-8 py-3 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Joining…' : 'Join now'}
      </button>

      {/* ✅ Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
          {/* overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />

          {/* panel */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="px-5 pt-5">
              <h3 id="join-modal-title" className="text-[16px] font-semibold text-[#0e0e0e]">
                {modalTitle}
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-[#444]">
                {modalMessage}
              </p>
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
