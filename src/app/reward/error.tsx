'use client'

import { useEffect } from 'react'

export default function RewardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[REWARD ERROR]', error)
  }, [error])

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e] flex items-center justify-center px-4">
      <div className="max-w-lg w-full border border-gray-200 p-6">
        <div className="text-[18px] font-semibold">Reward page crashed</div>
        <div className="mt-2 text-[13px] text-gray-600 whitespace-pre-wrap">
          {error.message}
          {error.digest ? `\nDigest: ${error.digest}` : ''}
        </div>
        <button
          className="mt-4 px-4 py-2 border border-gray-300 text-[14px] font-semibold hover:bg-gray-50"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </main>
  )
}
