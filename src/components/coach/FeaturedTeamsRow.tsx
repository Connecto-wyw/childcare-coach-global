'use client'

import Link from 'next/link'
import type { TeamCard } from '@/components/team/ActiveTeamsGrid'

export default function FeaturedTeamsRow({ teams }: { teams: TeamCard[] }) {
  if (!teams || teams.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      {teams.map((t) => (
        <Link
          key={t.id}
          href={`/team/${t.id}`}
          className="flex-none min-w-[calc(40%-4px)] block overflow-hidden rounded-xl border border-[#e9e9e9] bg-white hover:opacity-95 active:opacity-90"
        >
          <div className="w-full bg-[#f3f3f3] aspect-[4/3] overflow-hidden">
            {t.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#d9d9d9]" />
            )}
          </div>
          <div className="p-2">
            <div className="text-[13px] font-semibold text-[#0e0e0e] leading-snug line-clamp-2">{t.name}</div>
            {t.tags?.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {t.tags.map((tag, idx) => (
                  <span
                    key={`${t.id}_${idx}`}
                    className="rounded bg-[#EAF6FF] px-2 py-0.5 text-[11px] font-medium text-[#2F8EEA]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  )
}
