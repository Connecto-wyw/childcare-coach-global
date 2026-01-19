// src/app/team/[teamId]/page.tsx
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

// ✅ alias(@) 대신 상대경로로 고정 (빌드/paths 꼬임 방지)
import type { Database } from '../../../lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { teamId: string } }

type TeamRow = Database['public']['Tables']['teams']['Row']
type ActivityRow = Database['public']['Tables']['team_activities']['Row']

export default async function TeamDetailPage({ params }: Props) {
  const teamId = params?.teamId
  if (!teamId) notFound()

  // ✅ 제네릭을 명시해서 supabase 타입도 정상화
  const supabase = createServerComponentClient<Database>({ cookies })

  // ✅ team 변수를 "명시 타입"으로 선언 (never 방지)
  let team: TeamRow | null = null
  let activities: ActivityRow[] = []

  try {
    const teamRes = await supabase
      .from('teams')
      .select('id, name, description, created_at, image_url')
      .eq('id', teamId)
      .maybeSingle()

    if (teamRes.error) {
      console.error('[teamRes.error]', teamRes.error)
      notFound()
    }

    // ✅ 여기서 unknown을 한번 거쳐 강제 캐스팅 (TS 꼬임 완전 차단)
    team = (teamRes.data as unknown as TeamRow) ?? null
    if (!team) notFound()

    const activitiesRes = await supabase
      .from('team_activities')
      .select('id, team_id, title, description, created_at, starts_at, ends_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (activitiesRes.error) {
      console.error('[activitiesRes.error]', activitiesRes.error)
    } else {
      activities = ((activitiesRes.data ?? []) as unknown as ActivityRow[])
    }
  } catch (e) {
    console.error('[TeamDetailPage fatal]', e)
    notFound()
  }

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>
        {team.name ?? 'TEAM'}
      </h1>

      {team.description ? (
        <p style={{ marginTop: 8, lineHeight: 1.6 }}>{team.description}</p>
      ) : null}

      <div style={{ marginTop: 18, fontWeight: 700 }}>Ongoing TEAM UP</div>

      {activities.length === 0 ? (
        <p style={{ marginTop: 8 }}>No activities yet.</p>
      ) : (
        <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
          {activities.map((a) => (
            <Link
              key={a.id}
              href={`/team/${teamId}/activities/${a.id}`}
              style={{
                display: 'block',
                padding: 12,
                border: '1px solid #e5e5e5',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontWeight: 700 }}>{a.title ?? 'Untitled'}</div>
              {a.description ? (
                <div style={{ marginTop: 6, opacity: 0.8 }}>
                  {a.description}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
