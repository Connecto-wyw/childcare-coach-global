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
        setError('Invalid team URL.')
        return
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        setLoading(false)
        setError('Missing Supabase public env.')
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
          throw new Error('Failed to load team.')
        }

        const rows = JSON.parse(text) as Team[]
        const first = rows?.[0] ?? null

        if (!mounted) return

        if (!first) {
          setError('Team not found.')
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
  }, [teamId])

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      {/* 헤더 */}
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.2 }}>
          {loading ? 'Loading...' : team?.name ?? 'TEAM'}
        </h1>

        {!loading && team?.description ? (
          <p style={{ marginTop: 10, lineHeight: 1.7, opacity: 0.9 }}>
            {team.description}
          </p>
        ) : null}
      </header>

      {/* 상태/에러 */}
      {error ? (
        <section
          style={{
            padding: 12,
            border: '1px solid #eee',
            borderRadius: 12,
            background: '#fafafa',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Unable to load</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{error}</div>
        </section>
      ) : null}

      {/* 다음 단계 안내 (팀 활동 섹션 자리) */}
      {!error && !loading ? (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
            TEAM UP Activities
          </div>
          <div style={{ opacity: 0.75, lineHeight: 1.6 }}>
            Activities list will appear here.
          </div>
        </section>
      ) : null}
    </main>
  )
}
