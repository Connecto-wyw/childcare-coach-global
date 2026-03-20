// src/app/team/programs/[id]/page.tsx (Server Component)
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const cookieStore = await cookies()

  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        } catch {}
      },
    },
  })
}

type Program = {
  id: string
  title: string
  thumbnail_url: string | null
  period: string | null
  cost: string | null
  reward: string | null
  description: string | null
  is_active: boolean
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: program } = await (supabase as any)
    .from('market_programs')
    .select('*')
    .eq('id', id)
    .single()

  if (!program || !(program as Program).is_active) {
    notFound()
  }

  const prog = program as Program

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/team"
          className="inline-block mb-6 text-[14px] text-[#3497f3] hover:underline"
        >
          ← Back
        </Link>

        {prog.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prog.thumbnail_url}
            alt={prog.title}
            className="w-full rounded-xl object-cover aspect-video mb-6"
          />
        ) : null}

        <h1 className="text-[24px] font-bold text-[#0e0e0e] mb-6">{prog.title}</h1>

        <div className="divide-y divide-[#e9e9e9]">
          {prog.period ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Period</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.period}</span>
            </div>
          ) : null}
          {prog.cost ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Cost</span>
              <span className="text-[14px] text-[#3497f3] font-semibold">{prog.cost}</span>
            </div>
          ) : null}
          {prog.reward ? (
            <div className="flex justify-between py-3 border-b border-[#e9e9e9]">
              <span className="text-[14px] text-[#8a8a8a]">Reward</span>
              <span className="text-[14px] text-[#0e0e0e] font-medium">{prog.reward}</span>
            </div>
          ) : null}
        </div>

        {prog.description ? (
          <p className="mt-6 text-[14px] text-[#3a3a3a] leading-relaxed whitespace-pre-wrap">
            {prog.description}
          </p>
        ) : null}
      </div>
    </main>
  )
}
