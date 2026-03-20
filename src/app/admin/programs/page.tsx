import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminProgramsPage() {
  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const { data: programs } = await (supabase as any)
    .from('market_programs')
    .select('id,title,period,cost,is_active,created_at')
    .order('created_at', { ascending: false })

  const list = (programs ?? []) as {
    id: string
    title: string
    period: string | null
    cost: string | null
    is_active: boolean
    created_at: string
  }[]

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin · Programs</h1>
          <Link className="rounded-xl bg-[#3EB6F1] px-4 py-2 font-semibold text-black" href="/admin/programs/new">
            + New
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
          {list.map((prog) => (
            <Link
              key={prog.id}
              href={`/admin/programs/${prog.id}`}
              className="rounded-2xl bg-white/5 p-4 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{prog.title}</div>
                  <div className="text-sm text-white/60">
                    {prog.period ? `Period: ${prog.period}` : ''}
                    {prog.period && prog.cost ? '  ·  ' : ''}
                    {prog.cost ? `Cost: ${prog.cost}` : ''}
                  </div>
                </div>
                <div className="text-sm">
                  {prog.is_active ? (
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
