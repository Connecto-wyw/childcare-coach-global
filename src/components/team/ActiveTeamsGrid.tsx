// src/components/team/ActiveTeamsGrid.tsx
import Link from 'next/link'

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

export function buildTeamImageUrl(input: string | null | undefined) {
  const raw = (input ?? '').trim()
  if (!raw) return null

  // 이미 완성 URL이면 그대로 사용
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  if (!base) return null

  // 1) DB에 "team-images/..." 형태로 들어온 경우
  if (raw.startsWith('team-images/')) {
    return `${base}/storage/v1/object/public/${raw}`
  }

  // 2) DB에 "team/..." 또는 "7d08.../..." 형태로 경로만 들어온 경우
  // -> bucket: team-images
  return `${base}/storage/v1/object/public/team-images/${raw.replace(/^\//, '')}`
}

// ✅ DB Row -> TeamCard 변환용 (page.tsx에서 쓰려고 export)
export function mapTeamRowToCard(row: {
  id: string
  name: string
  image_url: string | null
  tag1: string | null
  tag2: string | null
}) {
  const tags = [row.tag1, row.tag2].map((v) => (v ?? '').trim()).filter(Boolean)
  return {
    id: row.id,
    name: row.name,
    imageUrl: buildTeamImageUrl(row.image_url),
    tags,
  } satisfies TeamCard
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[#d9d9d9] bg-white px-2 py-[2px] text-[12px] text-[#1e1e1e]">
      {label}
    </span>
  )
}

export default function ActiveTeamsGrid({ title = 'Ongoing Teams', teams, className }: Props) {
  if (!teams || teams.length === 0) return null

  return (
    <section className={className}>
      <h3 className="text-[13px] font-medium text-[#0e0e0e] mb-3">{title}</h3>

      {/* ✅ 모바일: 한 줄 2개 */}
      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => (
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
