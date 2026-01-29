// src/app/team/[teamId]/ShareButtonClient.tsx
'use client'

import { useState } from 'react'

export default function ShareButtonClient() {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = window.location.href
    const title = document.title || 'Team'

    try {
      // 모바일에서 특히 잘 됨
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch {
      // share 취소 등은 무시
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // 마지막 fallback: prompt
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <button
      onClick={share}
      className="h-9 rounded-xl bg-[#1e1e1e] px-4 text-[13px] font-semibold text-white"
    >
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}
