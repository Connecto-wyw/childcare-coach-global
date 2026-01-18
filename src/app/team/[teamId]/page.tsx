// src/app/team/[teamId]/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database, Tables } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamRow = Tables<'teams'>

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=60'

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const supabase = createServerComponentClient<Database>({ cookies })

  // ✅ select('*') 로 단순화: 타입 추론 깨지는 걸 피함
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', params.teamId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) redirect('/team')

  // ✅ 여기서 타입을 강제로 확정 (never 방지)
  const team = data as TeamRow

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <Link href="/team" className="text-sm text-white/70 hover:text-white">
            ← TEAM 목록
          </Link>
        </div>

        <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
          <div className="w-full aspect-[16/9] bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={team.image_url ?? FALLBACK_IMG}
              alt={team.name ?? 'team'}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-5">
            <div className="text-sm text-white/60">
              {team.region ? `지역: ${team.region}` : '지역: 미설정'}
            </div>

            <p className="mt-3 text-white/85 leading-relaxed">
              {team.purpose ?? team.description ?? '팀 소개가 아직 등록되지 않았습니다.'}
            </p>

            <div className="flex gap-2 mt-4">
              {team.tag1 ? (
                <span className="text-xs px-2 py-1 rounded-full bg-[#3EB6F1] text-black">
                  {team.tag1}
                </span>
              ) : null}
              {team.tag2 ? (
                <span className="text-xs px-2 py-1 rounded-full bg-[#3EB6F1] text-black">
                  {team.tag2}
                </span>
              ) : null}
            </div>

            <div className="mt-6">
              <Link
                href={`/team/${team.id}/activities`}
                className="inline-flex rounded-xl bg-[#3EB6F1] px-4 py-2 font-semibold text-black"
              >
                TEAM UP 활동 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
