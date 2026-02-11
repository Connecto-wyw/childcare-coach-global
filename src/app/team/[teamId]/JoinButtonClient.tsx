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

  const [open, setOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('Sign in required')
  const [modalMessage, setModalMessage] = useState('You must be signed in to join.')
  const [modalAction, setModalAction] = useState<'close' | 'google_login'>('close')

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

  const join = async () => {
    if (!teamId) return

    if (!user) {
      showModal('Sign in required', 'You must be signed in to join.', 'google_login')
      return
    }

    setSubmitting(true)

    try {
      // ✅ 유저 이메일 안전 확보
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

        if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
          showModal('Already joined', 'You have already joined this team.', 'close')
          setSubmitting(false)
          router.refresh()
          return
        }

        showModal('Error', msg || 'Insert failed.', 'close')
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      router.refresh()
      showModal('Joined', 'Joined successfully. We will notify you by email.', 'close')
    } catch (e: any) {
      // ✅ 여기로 오면 진짜 네트워크/환경/차단 케이스가 많음
      console.error('[join] unexpected error:', e)
      setSubmitting(false)
      showModal('Error', String(e?.message ?? e ?? 'Failed to fetch'), 'close')
    }
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
