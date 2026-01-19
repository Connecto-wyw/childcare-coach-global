// src/app/team/[teamId]/page.tsx
import type { Database } from '../../../lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { teamId?: string } }

function mask(v: string | undefined | null) {
  if (!v) return '(missing)'
  if (v.length <= 12) return '***'
  return `${v.slice(0, 6)}...${v.slice(-6)}`
}

async function safeText(res: Response) {
  try {
    const t = await res.text()
    // 너무 길면 잘라서 표시
    return t.length > 2000 ? t.slice(0, 2000) + '\n...<truncated>' : t
  } catch {
    return '(failed to read body)'
  }
}

export default async function TeamDebugPage({ params }: Props) {
  const teamId = params?.teamId ?? '(missing teamId)'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 1) ENV 점검
  const envInfo = {
    teamId,
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ?? null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(anonKey),
  }

  // 2) Supabase REST로 “직접” 조회 (auth-helpers, cookies 전부 배제)
  //    => 여기서 200/401/403/404/0rows가 나오면 원인이 바로 확정됨.
  let rest = {
    ok: false,
    status: null as number | null,
    statusText: null as string | null,
    body: null as string | null,
    hint: null as string | null,
  }

  if (!supabaseUrl || !anonKey) {
    rest.hint = 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in runtime env.'
  } else {
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

      const body = await safeText(res)

      rest = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        body,
        hint:
          res.status === 401
            ? '401: anon key / URL mismatch, or invalid key.'
            : res.status === 403
              ? '403: RLS or permissions blocked for anon.'
              : res.status === 404
                ? '404: Supabase REST endpoint not reachable (URL wrong) OR project not found.'
                : null,
      }
    } catch (e: any) {
      rest.hint = `Fetch failed: ${String(e?.message ?? e)}`
    }
  }

  // 3) 타입은 있어도 여기서는 사용 안함(진단이 목적)
  const info = { env: envInfo, supabase_rest_test: rest }

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 800 }}>TEAM DEBUG (no notFound)</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        This page always renders to reveal runtime env and Supabase REST response.
      </p>

      <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </main>
  )
}
