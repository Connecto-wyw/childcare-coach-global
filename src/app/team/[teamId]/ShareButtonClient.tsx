'use client'

import { useState } from 'react'

export default function ShareButtonClient() {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''

    try {
      // Web Share API 지원 기기 우선
      if (navigator.share) {
        await navigator.share({ url })
        return
      }

      // fallback: clipboard
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // 마지막 fallback
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      } catch {}
    }
  }

  return (
    <button
      onClick={share}
      className="rounded-xl bg-[#1e1e1e] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
    >
      {copied ? 'Copied' : 'Share'}
    </button>
  )
}
