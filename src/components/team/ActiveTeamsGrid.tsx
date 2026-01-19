// src/components/team/ActiveTeamsGrid.tsx
'use client'

import Link from 'next/link'
import { useMemo } from 'react'

export type TeamCard = {
  id: string
  name: string
  imageUrl: string | null
  tags: string[]
}

type Props = {
  title?: string
  teams: TeamCard[]
  className?: string
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[#d9d9d9] bg-white px-2 py-[2px] text-[12px] text-[#1e1e1e]">
      {label}
    </span>
  )
}

export default function ActiveTeamsGrid({ title = 'Ongoing Teams', teams, className="mt-3" }: Props) {
  const items = useMemo(() => (Array.isArray(teams) ? teams : []), [teams])

  if (items.length === 0) return null

  return (
    <section className={className}>
      <h3 className="text-[13px] font-medium text-[#0e0e0e] mb-3">{title}</h3>

      {/* ✅ 모바일: 한 줄 2개 */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((t) => (
          <Link
            key={t.id}
            href={`/team/${t.id}`}
            className="block rounded border border-[#d9d9d9] bg-[#f0f7fd] overflow-hidden"
          >
            {/* 이미지 */}
            <div className="w-full aspect-square bg-white">
              {t.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.imageUrl}
                  alt={t.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget
                    img.style.display = 'none'
                    const parent = img.parentElement
                    if (parent) {
                      parent.style.display = 'flex'
                      parent.style.alignItems = 'center'
                      parent.style.justifyContent = 'center'
                      parent.style.color = '#b4b4b4'
                      parent.style.fontSize = '12px'
                      parent.textContent = 'No image'
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#b4b4b4] text-[12px]">
                  No image
                </div>
              )}
            </div>

            {/* 텍스트 */}
            <div className="p-3">
              <div className="text-[#0e0e0e] text-[13px] font-semibold leading-snug line-clamp-2">
                {t.name}
              </div>

              {t.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.tags.slice(0, 3).map((tag) => (
                    <TagPill key={`${t.id}-${tag}`} label={tag} />
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
