// src/components/tips/TipSection.tsx
'use client'

import { useEffect, useState } from 'react'
import tips, { Tip } from '@/data/tips/todayTips'

export default function TipSection() {
  const [selectedTips, setSelectedTips] = useState<Tip[]>([])

  useEffect(() => {
    const pool: Tip[] = Array.isArray(tips) ? [...tips] : []
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    setSelectedTips(pool.slice(0, 2))
  }, [])

  return (
    <ul className="space-y-4 text-sm text-[#e0dcd7]">
      {selectedTips.map((tip, idx) => (
        <li key={idx} className="list-none">
          <h3 className="font-semibold mb-1 text-base">✔️ {tip.title}</h3>
          <p>{tip.content}</p>
        </li>
      ))}
    </ul>
  )
}

