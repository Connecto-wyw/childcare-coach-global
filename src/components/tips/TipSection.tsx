'use client'

import { useEffect, useState } from 'react'
import tips, { Tip } from '@/data/tips/todayTips'

export default function TipSection() {
  const [selectedTips, setSelectedTips] = useState<Tip[]>([])

  useEffect(() => {
    const shuffled = tips.sort(() => 0.5 - Math.random())
    setSelectedTips(shuffled.slice(0, 2))
  }, [])

  return (
    <section className="lg:col-span-2 bg-[#444444] p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3 text-[#ffffff]">📌 오늘의 육아 팁</h2>
      <ul className="space-y-4 text-sm text-[#e0dcd7]">
        {selectedTips.map((tip, idx) => (
          <li key={idx}>
            <h3 className="font-semibold mb-1 text-base">✔️ {tip.title}</h3>
            <p>{tip.content}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
