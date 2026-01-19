// src/components/team/ActiveTeamsGrid.tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Database } from '@/lib/database.types'

export type TeamRow = Database['public']['Tables']['teams']['Row']

export type TeamCard = {
  id: string
  name: string
  imageUrl: string | null
  tag1: string | null
  tag2: string | null
}

export function mapTeamRowToCard(row: TeamRow): TeamCard {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url ?? null,
    tag1: row.tag1 ?? null,
    tag2: row.tag2 ?? null,
  }
}

type Props = {
  title?: string
  teams: TeamCard[]
  className?: string
}

function Tags({ tag1, tag2 }: { tag1: string | null; tag2: string | null }) {
  const tags = [tag1, tag2].filter(Boolean) as string[]
  if (tags.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="text-[11px] leading-none px-2 py-1 rounded bg-white/70 text-[#1e1e1e] border border-[#dcdcdc]"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

export default function ActiveTeamsGrid({ title = 'Ongoing Teams', teams, className }: Props) {
  if (!teams || teams.length === 0) return null

  return (
    <section className={className ?? ''}>
      <div className="text-[13px] font-medium text-[#0e0e0e] mb-3">{title}</div>

      {/* ✅ 모바일 2열 */}
      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => {
          const href = `/team/${t.id}`

          return (
            <Link
              key={t.id}
              href={href}
              className="block rounded overflow-hidden bg-[#f0f7fd] border border-[#dcdcdc] hover:opacity-95 transition"
            >
              {/* 이미지 영역: 카드 폭에 맞춰 자동 반사이즈 */}
              <div className="relative w-full aspect-square bg-[#f5f5f5]">
                {t.imageUrl ? (
                  <Image
                    src={t.imageUrl}
                    alt={t.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                    priority={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#b4b4b4] text-[12px]">
                    No image
                  </div>
                )}
              </div>

              {/* 텍스트 영역 */}
              <div className="px-3 py-3">
                <div className="text-[13px] font-semibold text-[#0e0e0e] leading-snug line-clamp-2">
                  {t.name}
                </div>
                <Tags tag1={t.tag1} tag2={t.tag2} />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
