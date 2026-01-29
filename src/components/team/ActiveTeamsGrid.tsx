'use client'

import Link from 'next/link'

export type TeamCard = {
  id: string
  name: string
  imageUrl: string | null
  tags: string[]
}

type Props = {
  teams: TeamCard[]
  title?: string
  showTitle?: boolean // ✅ 기본 false로 해서, 내부 제목이 중복으로 안 뜨게
}

export default function ActiveTeamsGrid({ teams, title, showTitle = false }: Props) {
  if (!teams || teams.length === 0) return null

  return (
    <section>
      {/* ✅ showTitle=true일 때만 내부 제목 렌더 */}
      {showTitle && title ? (
        <div className="mb-3 text-[15px] font-medium text-[#0e0e0e]">
          {title}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/team/${t.id}`}
            className="block overflow-hidden rounded-2xl border border-[#e9e9e9] bg-white hover:opacity-95"
          >
            <div className="w-full bg-[#f3f3f3]">
              {t.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.imageUrl} alt={t.name} className="w-full h-auto object-cover" />
              ) : (
                <div className="aspect-[16/9] w-full bg-[#d9d9d9]" />
              )}
            </div>

            <div className="p-4">
              <div className="text-[18px] font-semibold text-[#0e0e0e]">{t.name}</div>

              {t.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.tags.map((tag, idx) => (
                    <span
                      key={`${t.id}_${idx}`}
                      className="rounded-md bg-[#EAF6FF] px-3 py-1.5 text-[14px] font-medium text-[#2F8EEA]"
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
    </section>
  )
}
