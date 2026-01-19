// src/components/tips/TipSection.tsx
import React from 'react'

type Tip = {
  title: string
  body: string
}

const DEFAULT_TIPS: Tip[] = [
  {
    title: 'Be Specific with Praise',
    body:
      'Praise actions, not outcomes. “I liked how you put the cars in the box when you cleaned up.” Specific praise sustains motivation.',
  },
  {
    title: 'Be Specific with Praise',
    body:
      'Praise actions, not outcomes. “I liked how you put the cars in the box when you cleaned up.” Specific praise sustains motivation.',
  },
]

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="#1e1e1e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function TipSection({ tips = DEFAULT_TIPS }: { tips?: Tip[] }) {
  const items = Array.isArray(tips) && tips.length > 0 ? tips.slice(0, 2) : DEFAULT_TIPS

  return (
    <div className="space-y-4">
      {items.map((tip, idx) => (
        <div key={`${tip.title}-${idx}`} className="bg-[#f0f7fd] px-4 py-4">
          {/* 상단: 체크 + 제목 */}
          <div className="flex items-start gap-3">
            <CheckIcon />
            <div className="text-[#3497f3] text-[15px] font-medium leading-snug">
              {tip.title}
            </div>
          </div>

          {/* 본문: 체크 아이콘 아래부터 시작 */}
          <div className="mt-2 ml-[32px] text-[#1e1e1e] text-[13px] font-normal leading-relaxed">
            {tip.body}
          </div>
        </div>
      ))}
    </div>
  )
}
