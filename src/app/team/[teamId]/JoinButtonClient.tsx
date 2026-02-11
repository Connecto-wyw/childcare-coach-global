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

  const showModal = (title: string, message: string) => {
    setModalTitle(title)
    setModalMessage(message)
    setOpen(true)
  }

  const closeModal = () => setOpen(false)

  const join = async () => {
    if (!teamId) return

    // ✅ not logged in → modal
    if (!user) {
      showModal('Sign in required', 'You must be signed in to join.')
      return
    }

    setSubmitting(true)

    // ✅ 로그인 유저 이메일 확보(확실히)
    // - useAuthUser의 user.email이 항상 들어있다고 보장 못 해서,
    //   auth.getUser()로 한 번 더 안전하게 가져옴
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
        email, // ✅ 추가: 이메일 저장
      },
    ])

    if (error) {
      const msg = String((error as any)?.message ?? '')
      const code = (error as any)?.code

      if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
        // ✅ already joined → modal
        showModal('Already joined', 'You have already joined this team.')
        setSubmitting(false)
        router.refresh()
        return
      }

      // ✅ generic error → modal
      showModal('Error', msg || 'Something went wrong.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    router.refresh()
    showModal('Joined', 'Joined successfully. We will notify you by email.')
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
              <p className="mt-2 text-[14px] leading-6 text-[#444]">{modalMessage}</p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#eee] px-5 py-3">
              <button
                type="button"
                onClick={closeModal}
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
