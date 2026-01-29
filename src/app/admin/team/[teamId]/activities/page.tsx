// src/app/admin/team/[teamId]/activities/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'
import type { Tables } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ActivityRow = Pick<
  Tables<'team_activities'>,
  'id' | 'team_id' | 'title' | 'description' | 'starts_at' | 'ends_at' | 'created_at'
>

function fmtDate(d: string | null) {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('en-US')
  } catch {
    return d
  }
}

export default async function AdminTeamActivitiesPage({ params }: { params: { teamId: string } }) {
  const teamId = params.teamId

  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  // 팀 존재 확인 (팀 이름 보여주려고)
  const { data: team } = await supabase.from('teams').select('id,name').eq('id', teamId).maybeSingle()
  if (!team) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-2xl font-bold">Admin · TEAM Activities</h1>
          <p className="mt-4 text-gray-300">Team not found.</p>
          <Link className="mt-6 inline-block text-[#3EB6F1] underline" href="/admin/team">
            Back to Teams
          </Link>
        </div>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('team_activities')
    .select('id,team_id,title,description,starts_at,ends_at,created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  const list = ((data ?? []) as ActivityRow[]) ?? []

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin · TEAM Activities</h1>
            <div className="mt-2 text-gray-300">
              Team: <span className="font-semibold text-white">{team.name}</span>
            </div>
            <div className="mt-1 text-sm text-gray-400">/{teamId}</div>
          </div>

          <div className="flex gap-2">
            <Link
              className="rounded bg-[#9F1D23] px-4 py-2 text-white font-semibold hover:opacity-90"
              href={`/admin/team/${teamId}/activities/new`}
            >
              + New Activity
            </Link>
            <Link className="rounded bg-gray-700 px-4 py-2 text-white font-semibold hover:opacity-90" href="/admin/team">
              Back
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-gray-700 bg-[#222] p-4 text-red-300">
            Failed to load activities: {error.message}
          </div>
        ) : list.length === 0 ? (
          <div className="mt-6 rounded-lg border border-gray-700 bg-[#222] p-6 text-gray-300">
            No activities yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {list.map((a) => (
              <Link
                key={a.id}
                href={`/admin/team/${teamId}/activities/${a.id}`}
                className="rounded-lg border border-gray-700 bg-[#222] p-4 hover:bg-[#2a2a2a]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-white">{a.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-gray-300">{a.description ?? ''}</div>

                    <div className="mt-2 text-xs text-gray-400">
                      Created: {fmtDate(a.created_at)} · Period: {fmtDate(a.starts_at)} ~ {fmtDate(a.ends_at)}
                    </div>
                  </div>

                  <div className="shrink-0 rounded bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white">
                    Edit
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
