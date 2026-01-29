// src/app/admin/team/[teamId]/activities/[activityId]/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function updateAction(teamId: string, activityId: string, formData: FormData) {
  'use server'

  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const starts_at = String(formData.get('starts_at') ?? '').trim()
  const ends_at = String(formData.get('ends_at') ?? '').trim()

  if (!title) throw new Error('title required')

  const payload = {
    title,
    description: description ? description : null,
    starts_at: starts_at ? starts_at : null,
    ends_at: ends_at ? ends_at : null,
  }

  const { error } = await supabase
    .from('team_activities')
    .update(payload)
    .eq('id', activityId)
    .eq('team_id', teamId)

  if (error) throw new Error(error.message)

  redirect(`/admin/team/${teamId}/activities`)
}

async function deleteAction(teamId: string, activityId: string) {
  'use server'

  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const { error } = await supabase.from('team_activities').delete().eq('id', activityId).eq('team_id', teamId)
  if (error) throw new Error(error.message)

  redirect(`/admin/team/${teamId}/activities`)
}

export default async function EditActivityPage({
  params,
}: {
  params: { teamId: string; activityId: string }
}) {
  const teamId = params.teamId
  const activityId = params.activityId

  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const { data: row, error } = await supabase
    .from('team_activities')
    .select('id,team_id,title,description,starts_at,ends_at,created_at')
    .eq('id', activityId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (error || !row) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-bold">Activity not found</h1>
          <Link className="mt-6 inline-block text-[#3EB6F1] underline" href={`/admin/team/${teamId}/activities`}>
            Back
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Activity</h1>
          <Link className="rounded bg-gray-700 px-4 py-2 text-white font-semibold hover:opacity-90" href={`/admin/team/${teamId}/activities`}>
            Back
          </Link>
        </div>

        <form action={updateAction.bind(null, teamId, activityId)} className="mt-6 rounded-lg border border-gray-700 bg-[#222] p-6">
          <label className="block text-sm font-semibold text-white">Title</label>
          <input
            name="title"
            defaultValue={row.title ?? ''}
            className="mt-2 w-full rounded bg-[#444] px-3 py-2 text-white placeholder-gray-400 outline-none"
          />

          <label className="mt-5 block text-sm font-semibold text-white">Description</label>
          <textarea
            name="description"
            defaultValue={row.description ?? ''}
            className="mt-2 h-40 w-full resize-none rounded bg-[#444] px-3 py-2 text-white placeholder-gray-400 outline-none"
          />

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-white">Starts at (optional)</label>
              <input
                name="starts_at"
                defaultValue={row.starts_at ?? ''}
                className="mt-2 w-full rounded bg-[#444] px-3 py-2 text-white placeholder-gray-400 outline-none"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white">Ends at (optional)</label>
              <input
                name="ends_at"
                defaultValue={row.ends_at ?? ''}
                className="mt-2 w-full rounded bg-[#444] px-3 py-2 text-white placeholder-gray-400 outline-none"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <form action={deleteAction.bind(null, teamId, activityId)}>
              <button className="rounded bg-[#1e1e1e] px-4 py-2 text-white font-semibold hover:opacity-90" type="submit">
                Delete
              </button>
            </form>

            <button className="rounded bg-[#9F1D23] px-4 py-2 text-white font-semibold hover:opacity-90" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
