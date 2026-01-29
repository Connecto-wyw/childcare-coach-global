'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser, useSupabase } from '@/app/providers'

type Props = { teamId: string }

export default function JoinButtonClient({ teamId }: Props) {
  const supabase = useSupabase()
  const { user, loading } = useAuthUser()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)

  const join = async () => {
    if (!teamId) return
    if (!user) {
      alert('로그인해야 참여할 수 있어.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('team_members').insert([
      {
        team_id: teamId,
        user_id: user.id,
      },
    ])

    if (error) {
      const msg = String(error.message ?? '')
      const code = (error as any)?.code
      if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
        alert('이미 참여한 팀이야.')
        setSubmitting(false)
        router.refresh()
        return
      }
      alert(msg)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    router.refresh()
  }

  return (
    <button
      onClick={join}
      disabled={loading || submitting}
      className="rounded-full bg-[#0e0e0e] px-8 py-3 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
    >
      {submitting ? 'Joining…' : 'Join now'}
    </button>
  )
}
