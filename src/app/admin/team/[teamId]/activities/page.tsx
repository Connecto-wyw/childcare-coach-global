// src/app/admin/team/[teamId]/activities/page.tsx
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'
import ActivitiesClient from './ActivitiesClient'
import type { Tables } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ActivityRow = Tables<'team_activities'>

export default async function AdminTeamActivitiesPage({
  params,
}: {
  params: { teamId: string }
}) {
  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const teamId = params.teamId

  // 팀 존재 확인(없으면 404 대신 admin 팀 목록으로 보내도 됨)
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id,name')
    .eq('id', teamId)
    .maybeSingle()

  if (teamErr || !team) redirect('/admin/team')

  const { data, error } = await supabase
    .from('team_activities')
    .select('id, team_id, title, body, description, image_url, is_active, sort_order, starts_at, ends_at, created_at')
    .eq('team_id', teamId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const list = ((data ?? []) as ActivityRow[]).map((row) => ({
    ...row,
    // body가 null이면 기존 description을 보여주도록 안전장치
    body: (row as any).body ?? row.description ?? null,
  })) as any as ActivityRow[]

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold">TEAM · Activities</h1>
            <p className="mt-1 text-[13px] font-medium text-[#b4b4b4]">
              Team: <span className="text-[#0e0e0e]">{team.name}</span>
            </p>
          </div>
          <a
            href="/admin/team"
            className="text-[13px] font-semibold text-[#3497f3] hover:underline underline-offset-2"
          >
            ← Back to Teams
          </a>
        </div>

        <div className="mt-8">
          <ActivitiesClient teamId={teamId} initial={list} />
        </div>
      </div>
    </main>
  )
}
