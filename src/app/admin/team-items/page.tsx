import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'
import type { Tables } from '@/lib/database.types'   // ✅ 추가

export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamItemRow = Pick<Tables<'team_items'>, 'id' | 'title' | 'slug' | 'is_active' | 'created_at'>

export default async function AdminTeamItemsPage() {
  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const { data: items } = await supabase
    .from('team_items')
    .select('id,title,slug,is_active,created_at')
    .order('created_at', { ascending: false })

  const list = (items ?? []) as TeamItemRow[]   // ✅ 핵심: items 타입 고정

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin · TEAM Items</h1>
          <Link className="rounded-xl bg-[#3EB6F1] px-4 py-2 font-semibold text-black" href="/admin/team-items/new">
            + New
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
          {list.map((it) => (
            <Link
              key={it.id}
              href={`/admin/team-items/${it.id}`}
              className="rounded-2xl bg-white/5 p-4 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-sm text-white/60">/{it.slug}</div>
                </div>
                <div className="text-sm">
                  {it.is_active ? (
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-green-200">active</span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-white/60">inactive</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
