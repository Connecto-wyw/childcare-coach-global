'use client'

import { useRouter } from 'next/navigation'
import { useSupabase } from '@/app/providers'
import ProgramForm, { ProgramFormData } from '@/components/admin/ProgramForm'

export default function NewProgramPage() {
  const supabase = useSupabase()
  const router = useRouter()

  async function handleSubmit(data: ProgramFormData) {
    const insertData = {
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

    const { error } = await (supabase as any).from('market_programs').insert(insertData)
    if (error) throw error
    
    router.push('/admin/programs')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold mb-6">New Program (프로그램 등록)</h1>
        <ProgramForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
}

