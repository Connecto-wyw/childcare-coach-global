'use client'

import { useEffect, useState } from 'react'

type ToastItem = {
  id: number
  amount: number
  reason: string
}

export const POINT_EARN_EVENT = 'points:earned'

export function dispatchPointEarn(amount: number, reason: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(POINT_EARN_EVENT, { detail: { amount, reason } }))
}

export default function PointEarnToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    let counter = 0
    const handler = (e: Event) => {
      const { amount, reason } = (e as CustomEvent).detail
      const id = ++counter
      setToasts((prev) => [...prev, { id, amount, reason }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        // 포인트 네비바 새로고침
        window.dispatchEvent(new Event('points:refresh'))
      }, 2200)
    }
    window.addEventListener(POINT_EARN_EVENT, handler)
    return () => window.removeEventListener(POINT_EARN_EVENT, handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-1.5 bg-[#9F1D23] text-white px-3 py-2 rounded-full shadow-lg text-[13px] font-bold"
          style={{ animation: 'pointFloat 2.2s ease-out forwards' }}
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M8 1c-3.31 0-6 1.19-6 2.67v6.66C2 11.81 4.69 13 8 13s6-1.19 6-2.67V3.67C14 2.19 11.31 1 8 1Zm0 1.33c2.94 0 4.67.65 4.67 1.34S10.94 5 8 5 3.33 4.35 3.33 3.67 5.06 2.33 8 2.33ZM8 11.67c-2.94 0-4.67-.65-4.67-1.34V8.93C4.39 9.35 6.1 9.67 8 9.67s3.61-.32 4.67-.74v1.4c0 .69-1.73 1.34-4.67 1.34Zm0-3c-2.94 0-4.67-.65-4.67-1.34V5.93C4.39 6.35 6.1 6.67 8 6.67s3.61-.32 4.67-.74v1.4c0 .69-1.73 1.34-4.67 1.34Z" />
          </svg>
          +{t.amount}P
          <span className="text-white/70 text-[11px] font-medium">· {t.reason}</span>
        </div>
      ))}
      <style>{`
        @keyframes pointFloat {
          0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
          15%  { opacity: 1; transform: translateY(-8px) scale(1); }
          70%  { opacity: 1; transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-36px) scale(0.9); }
        }
      `}</style>
    </div>
  )
}
