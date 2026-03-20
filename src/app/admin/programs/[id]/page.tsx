'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSupabase } from '@/app/providers'

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

function ProgramEditClient({ program }: { program: Program }) {
  const supabase = useSupabase()
  const router = useRouter()

  const [title, setTitle] = useState(program.title)
  const [thumbnailUrl, setThumbnailUrl] = useState(program.thumbnail_url ?? '')
  const [period, setPeriod] = useState(program.period ?? '')
  const [cost, setCost] = useState(program.cost ?? '')
  const [reward, setReward] = useState(program.reward ?? '')
  const [description, setDescription] = useState(program.description ?? '')
  const [isActive, setIsActive] = useState(program.is_active)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const inputClass = 'rounded-xl bg-white/10 p-3 w-full text-white placeholder:text-white/40 outline-none'

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await (supabase as any).from('market_programs').upsert({
      id: program.id,
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

  async function handleDelete() {
    if (!confirm('Delete this program?')) return
    setDeleting(true)
    await (supabase as any).from('market_programs').delete().eq('id', program.id)
    router.push('/admin/programs')
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Program</h1>

        <form onSubmit={handleUpdate} className="grid gap-4">
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
            {submitting ? 'Updating...' : 'Update'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white w-full"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </form>
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
