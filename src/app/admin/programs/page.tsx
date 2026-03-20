'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/app/providers'

type Program = {
  id: string
  title: string
  period: string | null
  cost: string | null
  is_active: boolean
  created_at: string
}

export default function AdminProgramsPage() {
  const supabase = useSupabase()
  const [list, setList] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(supabase as any)
      .from('market_programs')
      .select('id,title,period,cost,is_active,created_at')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Program[] | null }) => {
        setList(data ?? [])
        setLoading(false)
      })
  }, [supabase])

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin · Programs</h1>
          <Link
            className="rounded-xl bg-[#3EB6F1] px-4 py-2 font-semibold text-black"
            href="/admin/programs/new"
          >
            + New
          </Link>
        </div>

        {loading ? (
          <p className="text-white/40">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-white/40">No programs yet.</p>
        ) : (
          <div className="grid gap-3">
            {list.map((prog) => (
              <Link
                key={prog.id}
                href={`/admin/programs/${prog.id}`}
                className="rounded-2xl bg-white/5 p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{prog.title}</div>
                    <div className="text-sm text-white/60 mt-0.5">
                      {[prog.period && `Period: ${prog.period}`, prog.cost && `Cost: ${prog.cost}`]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </div>
                  </div>
                  <div className="text-sm shrink-0 ml-4">
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
        )}
      </div>
    </div>
  )
}
