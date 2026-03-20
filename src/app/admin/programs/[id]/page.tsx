'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSupabase } from '@/app/providers'

type Program = {
  id: string
  title: string
  thumbnail_url: string | null
  habit_type: string | null
  auth_method: string | null
  period_days: number | null
  auth_count: number | null
  weekly_max_count: number | null
  start_date: string | null
  end_date: string | null
  deposit: number | null
  basic_reward: number | null
  discount_rate: number | null
  bonus_reward: number | null
  guide_html: string | null
  is_active: boolean
}

import ProgramForm, { ProgramFormData } from '@/components/admin/ProgramForm'

function ProgramEditClient({ program }: { program: Program }) {
  const supabase = useSupabase()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleUpdate(data: ProgramFormData) {
    const updateData = {
      id: program.id,
      title: data.title,
      thumbnail_url: data.thumbnail_url || null,
      habit_type: data.habit_type || null,
      auth_method: data.auth_method || null,
      period_days: data.period_days ? Number(data.period_days) : null,
      auth_count: data.auth_count ? Number(data.auth_count) : null,
      weekly_max_count: data.weekly_max_count ? Number(data.weekly_max_count) : null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      deposit: data.deposit ? Number(data.deposit) : null,
      basic_reward: data.basic_reward ? Number(data.basic_reward) : null,
      discount_rate: data.discount_rate ? Number(data.discount_rate) : 0,
      bonus_reward: data.bonus_reward ? Number(data.bonus_reward) : null,
      guide_html: data.guide_html || null,
      is_active: data.is_active,
    }

    const { error } = await (supabase as any).from('market_programs').upsert(updateData)
    if (error) throw error
    
    router.push('/admin/programs')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this program?')) return
    setDeleting(true)
    await (supabase as any).from('market_programs').delete().eq('id', program.id)
    router.push('/admin/programs')
    router.refresh()
  }

  const initialData: Partial<ProgramFormData> = {
    title: program.title,
    thumbnail_url: program.thumbnail_url ?? '',
    habit_type: program.habit_type ?? 'daily',
    auth_method: program.auth_method ?? 'photo',
    period_days: program.period_days ?? '',
    auth_count: program.auth_count ?? '',
    weekly_max_count: program.weekly_max_count ?? 7,
    start_date: program.start_date ?? '',
    end_date: program.end_date ?? '',
    deposit: program.deposit ?? '',
    basic_reward: program.basic_reward ?? '',
    discount_rate: program.discount_rate ?? 0,
    bonus_reward: program.bonus_reward ?? '',
    guide_html: program.guide_html ?? '',
    is_active: program.is_active,
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Program (프로그램 수정)</h1>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl bg-red-600/20 hover:bg-red-600/30 px-4 py-2 text-sm font-semibold text-red-500 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete Program'}
          </button>
        </div>
        
        <ProgramForm initialData={initialData} onSubmit={handleUpdate} />
      </div>
    </div>
  )
}

export default function ProgramEditPage() {
  const supabase = useSupabase()
  const params = useParams()
  const router = useRouter()
  const id = String((params as any)?.id ?? '')

  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(supabase as any)
      .from('market_programs')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }: { data: Program | null }) => {
        if (!data) {
          router.push('/admin/programs')
        } else {
          setProgram(data)
        }
        setLoading(false)
      })
  }, [id, supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] text-white flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    )
  }

  if (!program) return null

  return <ProgramEditClient program={program} />
}
