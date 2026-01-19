// src/app/team/[teamId]/page.tsx
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { notFound } from 'next/navigation'
import type { Database } from '../../../lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { teamId: string } }
type TeamRow = Database['public']['Tables']['teams']['Row']

function mask(v: string | undefined | null) {
  if (!v) return '(missing)'
  if (v.length <= 10) return '***'
  return `${v.slice(0, 6)}...${v.slice(-6)}`
}

export default async function TeamDetailPage({ params }: Props) {
  const teamId = params?.teamId
  if (!teamId) notFound()

  // ✅ 지금 문제 teamId에서만 디버그 화면 노출
  const DEBUG_TEAM_ID = 'eee3586c-2ffe-45c5-888d-0a98f4d0b0d9'
  const debugMode = teamId === DEBUG_TEAM_ID

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = createServerComponentClient<Database>({ cookies })

  // 1) 팀 조회 시도
  const teamRes = await supabase
    .from('teams')
    .select('id, name, created_at')
    .eq('id', teamId)
    .maybeSingle()

  // ✅ 디버그 모드: notFound 전에 모든 상태를 화면에 출력
  if (debugMode) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>TEAM DEBUG</h1>

        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(
  {
    teamId,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ?? null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(anonKey),
      NODE_ENV: process.env.NODE_ENV ?? null,
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    },
    teamRes: {
      data: teamRes.data ?? null,
      error: teamRes.error ?? null,
    },
  },
  null,
  2
)}
        </pre>
      </main>
    )
  }

  // 2) 실제 화면(디버그 아닐 때)
  if (teamRes.error) {
    console.error('[teamRes.error]', teamRes.error)
    notFound()
  }
  const team = (teamRes.data as unknown as TeamRow) ?? null
  if (!team) notFound()

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>{team.name}</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>{team.id}</p>
    </main>
  )
}
