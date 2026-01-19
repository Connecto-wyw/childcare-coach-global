// src/app/team/[teamId]/page.tsx
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../../../lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamRow = Database['public']['Tables']['teams']['Row']

export default async function TeamDetailPage({
  params,
}: {
  params: { teamId: string }
}) {
  // ✅ 표준 시그니처면 여기엔 무조건 값이 들어와야 정상
  const teamId = params.teamId

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
