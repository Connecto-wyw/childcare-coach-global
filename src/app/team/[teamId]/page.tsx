// src/app/team/[teamId]/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type Team = {
  id: string
  name: string
  description: string | null
  created_at: string
}

function extractUuidFromPath(pathname: string) {
  const m = pathname.match(/\/team\/([0-9a-fA-F-]{36})$/)
  return m?.[1] ?? null
}

export default function TeamDetailClientPage() {
  const pathname = usePathname()

  const teamId = useMemo(() => extractUuidFromPath(pathname), [pathname])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)

  useEffect(() => {
    let mounted = true

    async function run() {
      setLoading(true)
      setError(null)
      setTeam(null)

      if (!teamId) {
        setLoading(false)
        setError(`Invalid URL. pathname=${pathname}`)
        return
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        setLoading(false)
        setError('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
        return
      }

      const url = `${supabaseUrl}/rest/v1/teams?id=eq.${encodeURIComponent(
        teamId
      )}&select=id,name,description,created_at`

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        })

        const text = await res.text()
        if (!res.ok) {
          throw new Error(`Supabase REST ${res.status} ${res.statusText}: ${text}`)
        }

        const rows = JSON.parse(text) as Team[]
        const first = rows?.[0] ?? null

        if (!mounted) return

        if (!first) {
          setError('Team not found (empty result). Check teams table / id.')
          setTeam(null)
        } else {
          setTeam(first)
        }
      } catch (e: any) {
        if (!mounted) return
        setError(String(e?.message ?? e))
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [teamId, pathname])

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>
        {loading ? 'Loading...' : team?.name ?? 'TEAM'}
      </h1>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        pathname: <b>{pathname}</b>
      </p>
      <p style={{ marginTop: 4, opacity: 0.8 }}>
        teamId: <b>{teamId ?? '(missing)'}</b>
      </p>

      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>ERROR</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
        </div>
      ) : null}

      {team?.description ? (
        <p style={{ marginTop: 12, lineHeight: 1.6 }}>{team.description}</p>
      ) : null}
    </main>
  )
}
