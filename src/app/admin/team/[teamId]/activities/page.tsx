// src/app/admin/team/[teamId]/activities/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'
import type { Tables } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ActivityRow = Tables<'team_activities'>

function toInputDateTime(value: string | null) {
  // datetime-local input 용 (YYYY-MM-DDTHH:mm)
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isActiveByRange(startsAt: string | null, endsAt: string | null) {
  const now = Date.now()
  const s = startsAt ? new Date(startsAt).getTime() : null
  const e = endsAt ? new Date(endsAt).getTime() : null
  if (s && Number.isNaN(s)) return false
  if (e && Number.isNaN(e)) return false

  if (s && now < s) return false
  if (e && now > e) return false
  return true
}

export default async function AdminTeamActivitiesPage({ params }: { params: { teamId: string } }) {
  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const teamId = params.teamId

  // 팀 존재 확인(이름 표시용)
  const { data: team } = await supabase.from('teams').select('id,name').eq('id', teamId).maybeSingle()
  if (!team) redirect('/admin/team')

  const { data } = await supabase
    .from('team_activities')
    .select('id, team_id, title, description, starts_at, ends_at, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  const list = (data ?? []) as ActivityRow[]

  async function createAction(formData: FormData) {
    'use server'

    const { ok, supabase } = await requireAdmin()
    if (!ok) redirect('/')

    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const startsAtRaw = String(formData.get('starts_at') ?? '').trim()
    const endsAtRaw = String(formData.get('ends_at') ?? '').trim()

    if (!title) throw new Error('title required')

    const starts_at = startsAtRaw ? new Date(startsAtRaw).toISOString() : null
    const ends_at = endsAtRaw ? new Date(endsAtRaw).toISOString() : null

    const { error } = await supabase.from('team_activities').insert([
      {
        team_id: teamId,
        title,
        description: description || null,
        starts_at,
        ends_at,
      },
    ])

    if (error) throw new Error(error.message)

    redirect(`/admin/team/${teamId}/activities`)
  }

  async function updateAction(formData: FormData) {
    'use server'

    const { ok, supabase } = await requireAdmin()
    if (!ok) redirect('/')

    const id = String(formData.get('id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const startsAtRaw = String(formData.get('starts_at') ?? '').trim()
    const endsAtRaw = String(formData.get('ends_at') ?? '').trim()

    if (!id) throw new Error('id required')
    if (!title) throw new Error('title required')

    const starts_at = startsAtRaw ? new Date(startsAtRaw).toISOString() : null
    const ends_at = endsAtRaw ? new Date(endsAtRaw).toISOString() : null

    const { error } = await supabase
      .from('team_activities')
      .update({
        title,
        description: description || null,
        starts_at,
        ends_at,
      })
      .eq('id', id)
      .eq('team_id', teamId)

    if (error) throw new Error(error.message)

    redirect(`/admin/team/${teamId}/activities`)
  }

  async function deleteAction(formData: FormData) {
    'use server'

    const { ok, supabase } = await requireAdmin()
    if (!ok) redirect('/')

    const id = String(formData.get('id') ?? '').trim()
    if (!id) throw new Error('id required')

    const { error } = await supabase.from('team_activities').delete().eq('id', id).eq('team_id', teamId)
    if (error) throw new Error(error.message)

    redirect(`/admin/team/${teamId}/activities`)
  }

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold">Admin · TEAM Activities</h1>
            <div className="mt-1 text-[13px] text-[#6b6b6b]">
              Team: <span className="font-medium text-[#0e0e0e]">{team.name}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/team" className="rounded-xl border border-[#dcdcdc] px-4 py-2 text-[13px] font-medium">
              Back
            </Link>
          </div>
        </div>

        {/* Create */}
        <section className="mt-8 rounded-2xl border border-[#e5e5e5] p-5">
          <div className="text-[16px] font-semibold">Create activity</div>

          <form action={createAction} className="mt-4 grid gap-3">
            <input
              name="title"
              placeholder="Title (required)"
              className="w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
            />
            <textarea
              name="description"
              placeholder="Description (markdown or plain text)"
              className="min-h-[140px] w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[12px] text-[#6b6b6b]">Starts at (optional)</div>
                <input
                  name="starts_at"
                  type="datetime-local"
                  className="w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
                />
              </div>
              <div>
                <div className="mb-1 text-[12px] text-[#6b6b6b]">Ends at (optional)</div>
                <input
                  name="ends_at"
                  type="datetime-local"
                  className="w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
                />
              </div>
            </div>

            <button className="mt-2 rounded-xl bg-[#1e1e1e] px-4 py-3 text-[15px] font-semibold text-white">
              Create
            </button>
          </form>
        </section>

        {/* List */}
        <section className="mt-10">
          <div className="text-[16px] font-semibold">Activities</div>

          {list.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#e5e5e5] p-6 text-[#6b6b6b]">No activities yet.</div>
          ) : (
            <div className="mt-4 grid gap-4">
              {list.map((a) => {
                const active = isActiveByRange(a.starts_at ?? null, a.ends_at ?? null)

                return (
                  <div key={a.id} className="rounded-2xl border border-[#e5e5e5] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-[18px] font-semibold">{a.title}</div>
                          <span
                            className={[
                              'rounded-full px-3 py-1 text-[12px] font-medium',
                              active ? 'bg-[#EAF6FF] text-[#2F8EEA]' : 'bg-[#f2f2f2] text-[#6b6b6b]',
                            ].join(' ')}
                          >
                            {active ? 'active' : 'inactive'}
                          </span>
                        </div>

                        {a.description ? (
                          <div className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[#3a3a3a]">
                            {a.description}
                          </div>
                        ) : (
                          <div className="mt-2 text-[14px] text-[#6b6b6b]">No description.</div>
                        )}

                        <div className="mt-3 text-[12px] text-[#8a8a8a]">
                          created: {a.created_at ? new Date(a.created_at).toLocaleString('en-US') : '-'}
                          {a.starts_at ? ` · starts: ${new Date(a.starts_at).toLocaleString('en-US')}` : ''}
                          {a.ends_at ? ` · ends: ${new Date(a.ends_at).toLocaleString('en-US')}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Edit form */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-[13px] font-medium text-[#3497f3]">
                        Edit / Delete
                      </summary>

                      <div className="mt-3 grid gap-3">
                        <form action={updateAction} className="grid gap-3">
                          <input type="hidden" name="id" value={a.id} />
                          <input
                            name="title"
                            defaultValue={a.title ?? ''}
                            className="w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
                          />
                          <textarea
                            name="description"
                            defaultValue={a.description ?? ''}
                            className="min-h-[120px] w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
                          />

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-[12px] text-[#6b6b6b]">Starts at</div>
                              <input
                                name="starts_at"
                                type="datetime-local"
                                defaultValue={toInputDateTime(a.starts_at ?? null)}
                                className="w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
                              />
                            </div>
                            <div>
                              <div className="mb-1 text-[12px] text-[#6b6b6b]">Ends at</div>
                              <input
                                name="ends_at"
                                type="datetime-local"
                                defaultValue={toInputDateTime(a.ends_at ?? null)}
                                className="w-full rounded-xl border border-[#dcdcdc] px-4 py-3 text-[15px]"
                              />
                            </div>
                          </div>

                          <button className="rounded-xl bg-[#1e1e1e] px-4 py-3 text-[15px] font-semibold text-white">
                            Save
                          </button>
                        </form>

                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="w-full rounded-xl bg-[#9F1D23] px-4 py-3 text-[15px] font-semibold text-white">
                            Delete
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
