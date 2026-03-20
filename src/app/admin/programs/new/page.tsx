'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/app/providers'

export default function NewProgramPage() {
  const supabase = useSupabase()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [period, setPeriod] = useState('')
  const [cost, setCost] = useState('')
  const [reward, setReward] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const inputClass = 'rounded-xl bg-white/10 p-3 w-full text-white placeholder:text-white/40 outline-none'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await (supabase as any).from('market_programs').insert({
      title,
      thumbnail_url: thumbnailUrl || null,
      period: period || null,
      cost: cost || null,
      reward: reward || null,
      description: description || null,
      is_active: isActive,
    })
    router.push('/admin/programs')
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-6">New Program</h1>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
          />
          <input
            placeholder="Thumbnail URL"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Period (e.g. 4 weeks)"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Cost (e.g. $99)"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Reward"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className={inputClass}
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
            className={inputClass}
          />

          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#3EB6F1] px-4 py-3 font-semibold text-black w-full mt-2"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  )
}
