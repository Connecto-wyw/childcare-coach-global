'use client'

import { useMemo, useState } from 'react'

const INDIANBOB_RED = '#9F1D23'

type Props = { teamId: string }

function isValidEmail(v: string) {
  const s = v.trim()
  if (!s) return false
  // 너무 빡세게 검증하지 말고 기본만
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function Modal({
  open,
  title,
  message,
  email,
  setEmail,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  message: string
  email: string
  setEmail: (v: string) => void
  submitting: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="text-[16px] font-extrabold text-[#1e1e1e]">{title}</div>
        <div className="mt-2 text-[13px] leading-relaxed text-[#6b6b6b] whitespace-pre-wrap">{message}</div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-4 w-full rounded-lg border border-[#e5e5e5] bg-[#f7fbff] px-4 py-3 text-[14px] outline-none focus:border-[#bcdcff]"
          autoFocus
          inputMode="email"
        />

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-10 rounded-lg px-4 text-[13px] font-semibold border border-[#e5e5e5] text-[#1e1e1e] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            disabled={submitting}
            className="h-10 rounded-lg px-5 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#111' }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AlertModal({
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg border border-[#e5e5e5]">
        <div className="text-[15px] font-extrabold text-[#1e1e1e]">{title}</div>
        <div className="mt-2 text-[13px] text-[#6b6b6b] whitespace-pre-wrap leading-relaxed">{message}</div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="h-10 rounded-lg bg-[#111] px-5 text-[13px] font-semibold text-white">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GiveawayEntryButtonClient({ teamId }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const [alertOpen, setAlertOpen] = useState(false)
  const [alertTitle, setAlertTitle] = useState('Notice')
  const [alertMsg, setAlertMsg] = useState('')

  const entryTitle = 'Entry completed'
  const entryMsg =
    "Your entry has been received. If you win, we’ll contact you by email.\nPlease enter the email address to notify."

  const showAlert = (title: string, msg: string) => {
    setAlertTitle(title)
    setAlertMsg(msg)
    setAlertOpen(true)
  }

  const canSubmit = useMemo(() => isValidEmail(email), [email])

  const onClickEnter = () => {
    setOpen(true)
  }

  const onClose = () => {
    if (submitting) return
    setOpen(false)
  }

  const onSubmit = async () => {
    if (!canSubmit) {
      showAlert('Invalid email', 'Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/giveaway/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, email: email.trim() }),
      })

      // ✅ 여기서 404/500도 다 잡음
      const text = await res.text()
      let json: any = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = { raw: text }
      }

      if (!res.ok) {
        // 서버에서 에러 메시지 내려주면 그거 사용
        const msg =
          json?.message ||
          json?.error ||
          `Request failed (${res.status}). Please try again.`
        showAlert('Error', msg)
        return
      }

      // ✅ 중복 참여 케이스
      if (json?.code === 'ALREADY_ENTERED') {
        showAlert('Already entered', 'You have already entered this giveaway.')
        return
      }

      // ✅ 성공
      showAlert('Done', 'Your email has been saved. Thank you!')
      setOpen(false)
      setEmail('')
    } catch (e: any) {
      // ✅ fetch 자체 실패 (네트워크/라우트 없음 등)
      showAlert('Network error', e?.message || 'Please try again.')
    } finally {
      // ✅ 여기 때문에 “무한 Submitting”이 사라짐
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClickEnter}
        className="h-[44px] px-8 rounded-full text-white text-[14px] font-semibold"
        style={{ backgroundColor: INDIANBOB_RED }}
      >
        Enter for Free
      </button>

      <Modal
        open={open}
        title={entryTitle}
        message={entryMsg}
        email={email}
        setEmail={setEmail}
        submitting={submitting}
        onClose={onClose}
        onSubmit={onSubmit}
      />

      <AlertModal open={alertOpen} title={alertTitle} message={alertMsg} onClose={() => setAlertOpen(false)} />
    </>
  )
}