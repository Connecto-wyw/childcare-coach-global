// src/components/tips/TipSection.tsx
import React, { useMemo } from 'react'

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
    title: 'Name the Feeling First',
    body:
      'Start with the emotion: “You’re frustrated.” Naming feelings reduces escalation and opens the door to problem-solving.',
  },
  {
    title: 'Offer Two Good Choices',
    body:
      'Instead of open-ended demands, give two acceptable options. It preserves autonomy and reduces power struggles.',
  },
  {
    title: 'Connect Before Correct',
    body:
      'A brief connection (“I’m here.”) before redirecting behavior helps kids feel safe enough to cooperate.',
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
      className="shrink-0 mt-[2px]"
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

// ✅ 중복 없이 랜덤 n개 뽑기
function pickRandomUnique<T>(arr: T[], n: number) {
  const src = Array.isArray(arr) ? arr.filter(Boolean) : []
  if (src.length <= n) return src

  const picked: T[] = []
  const used = new Set<number>()

  while (picked.length < n) {
    const idx = Math.floor(Math.random() * src.length)
    if (used.has(idx)) continue
    used.add(idx)
    picked.push(src[idx])
  }

  return picked
}

export default function TipSection({ tips = DEFAULT_TIPS }: { tips?: Tip[] }) {
  // ✅ tips가 바뀔 때만 랜덤 재선택 (re-render만으로 계속 바뀌지 않게)
  const items = useMemo(() => {
    const source = Array.isArray(tips) && tips.length > 0 ? tips : DEFAULT_TIPS
    const count = Math.min(2, source.length)
    return pickRandomUnique(source, count)
  }, [tips])

  return (
    <div className="space-y-4">
      {items.map((tip, idx) => (
        <div key={`${tip.title}-${idx}`} className="bg-[#f0f7fd] px-4 py-4">
          <div className="flex gap-3">
            <CheckIcon />

            <div className="min-w-0">
              <div className="text-[#3497f3] text-[15px] font-medium leading-snug">{tip.title}</div>
              <div className="mt-2 text-[#1e1e1e] text-[13px] font-normal leading-relaxed">
                {tip.body}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
