// src/app/teams/[teamId]/page.tsx
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import TeamDetailClient from './TeamDetailClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
  return createServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  })
}

export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const supabase = await getSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id ?? null

  const { data: team } = await (supabase as any)
    .from('community_teams')
    .select('id, name, owner_id, visibility')
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  // 비공개 팀: 오너 또는 멤버만 접근
  if (team.visibility === 'private' && team.owner_id !== userId) {
    const { data: membership } = await (supabase as any)
      .from('community_team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId ?? '')
      .single()
    if (!membership) notFound()
  }

  const { data: events } = await (supabase as any)
    .from('community_team_events')
    .select('id, title, event_date, event_time, purpose, fee')
    .eq('team_id', teamId)
    .order('event_date', { ascending: true })

  return (
    <TeamDetailClient
      teamId={teamId}
      teamName={team.name}
      events={events ?? []}
    />
  )
}
