'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthUser, useSupabase } from '@/app/providers'

type ProfileRow = { points: number }

export default function PointsHeader() {
  // ✅ 너 프로젝트는 객체 형태로 내려옴
  const { user } = useAuthUser()
  const supabase = useSupabase()

  const [points, setPoints] = useState<number>(0)
  const [loadingPoints, setLoadingPoints] = useState(false)

  // ✅ Google 계정 이름 (user_metadata에서)
  const googleName = useMemo(() => {
    const meta = (user?.user_metadata as any) ?? null
    return meta?.full_name || meta?.name || meta?.email || null
  }, [user])

  useEffect(() => {
    let alive = true

    async function run() {
      if (!user) {
        setPoints(0)
        return
      }

      setLoadingPoints(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>()

      if (!alive) return

      if (error) {
        setPoints(0)
      } else {
        setPoints(data?.points ?? 0)
      }
      setLoadingPoints(false)
    }

    run()
    return () => {
      alive = false
    }
  }, [user, supabase])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm">
        <span className="font-semibold">Points:</span>{' '}
        <span>{loadingPoints ? '...' : points}</span>
        {user && googleName ? (
          <span className="ml-2 text-neutral-600">({googleName})</span>
        ) : null}
      </div>

      {!user ? (
        <button
          onClick={signInWithGoogle}
          className="rounded-md bg-black px-3 py-2 text-sm text-white"
        >
          Sign in with Google
        </button>
      ) : null}
    </div>
  )
}
