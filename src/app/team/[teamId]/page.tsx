// src/app/team/[teamId]/page.tsx
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../../../lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Record<string, string | string[] | undefined> }

// ✅ DB Row 타입을 명시로 고정
type TeamRow = Database['public']['Tables']['teams']['Row']

function pickFirst(v: string | string[] | undefined) {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

function getTeamId(params: Record<string, any>) {
  return (
    pickFirst(params.teamId) ||
    pickFirst(params.id) ||
    pickFirst(params.slug) ||
    (Object.keys(params).length === 1 ? pickFirst(params[Object.keys(params)[0]]) : null)
  )
}

export default async function TeamDetailPage({ params }: Props) {
  const teamId = getTeamId(params)

  // ✅ 파라미터 없으면 디버그 화면 노출
  if (!teamId) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>TEAM PARAMS ERROR</h1>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify({ params }, null, 2)}
        </pre>
      </main>
    )
  }

  // ✅ 제네릭 지정 (중요)
  const supabase = createServerComponentClient<Database>({ cookies })

  const teamRes = await supabase
    .from('teams')
    .select('id, name, description, created_at')
    .eq('id', teamId)
    .maybeSingle()

  if (teamRes.error) {
    console.error('[teamRes.error]', teamRes.error)
    notFound()
  }

  // ✅ 여기서 타입 강제 고정 (never 방지)
  const team = (teamRes.data as unknown as TeamRow) ?? null
  if (!team) notFound()

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{team.name ?? 'TEAM'}</h1>

      {team.description ? (
        <p style={{ marginTop: 8, lineHeight: 1.6 }}>{team.description}</p>
      ) : null}

      <p style={{ marginTop: 10, opacity: 0.7 }}>teamId: {team.id}</p>
    </main>
  )
}
