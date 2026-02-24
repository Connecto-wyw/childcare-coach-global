'use client'

import { useState } from 'react'

type Props = {
  teamId: string
}

export default function GiveawayEntryButtonClient({ teamId }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const openModal = () => {
    setMessage(
      'Your entry has been received. If you win, we’ll contact you by email. Please enter the email address to notify.'
    )
    setOpen(true)
  }

  const closeModal = () => setOpen(false)

  const submit = async () => {
    if (!email) return

    setSubmitting(true)

    const res = await fetch('/api/giveaway/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        email,
      }),
    })

    const data = await res.json()

    setSubmitting(false)

    // ✅ 이미 참여
    if (data?.alreadyEntered) {
      setMessage('You have already entered this giveaway.')
      return
    }

    if (!res.ok) {
      setMessage('Something went wrong. Please try again.')
      return
    }

    setMessage('Entry completed successfully. Good luck!')
  }

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-full bg-[#0e0e0e] px-8 py-3 text-[15px] font-semibold text-white hover:opacity-90"
      >
        Enter for Free
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
            <h3 className="text-[16px] font-semibold">
              Entry completed
            </h3>

            <p className="mt-2 text-[14px] text-[#444] leading-6">
              {message}
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-4 w-full rounded-lg border border-[#ddd] px-3 py-2 text-[14px]"
            />

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-4 w-full rounded-lg bg-black text-white py-2 font-semibold"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}