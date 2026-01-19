// src/app/team/[teamId]/page.tsx
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../../../lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function mask(v: string | undefined | null) {
  if (!v) return '(missing)'
  if (v.length <= 12) return '***'
  return `${v.slice(0, 6)}...${v.slice(-6)}`
}

async function safeText(res: Response) {
  try {
    const t = await res.text()
    return t.length > 2000 ? t.slice(0, 2000) + '\n...<truncated>' : t
  } catch {
    return '(failed to read body)'
  }
}

export default async function TeamDebugPage({
  params,
}: {
  params: { teamId: string }
}) {
  const teamId = params.teamId

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 1) auth-helpers 기반 조회(현재 너 코드 흐름)
  const supabase = createServerComponentClient<Database>({ cookies })
  const teamRes = await supabase
    .from('teams')
    .select('id, name, description, created_at')
    .eq('id', teamId)
    .maybeSingle()

  // 2) Supabase REST 직접 조회(쿠키/세션 영향 제거)
  let rest = {
    ok: false,
    status: null as number | null,
    statusText: null as string | null,
    body: null as string | null,
  }

  if (supabaseUrl && anonKey) {
    const url = `${supabaseUrl}/rest/v1/teams?id=eq.${encodeURIComponent(teamId)}&select=id,name,created_at`
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
      rest = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        body: await safeText(res),
      }
    } catch (e: any) {
      rest = {
        ok: false,
        status: null,
        statusText: 'FETCH_FAILED',
        body: String(e?.message ?? e),
      }
    }
  } else {
    rest.body = 'Missing env NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  }

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900 }}>TEAM DEBUG</h1>
      <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(
  {
    teamId,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ?? null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(anonKey),
      NODE_ENV: process.env.NODE_ENV ?? null,
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    },
    auth_helpers_query: {
      data: teamRes.data ?? null,
      error: teamRes.error ?? null,
    },
    rest_query: rest,
  },
  null,
  2
)}
      </pre>
    </main>
  )
}
